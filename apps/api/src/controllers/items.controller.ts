import { randomUUID } from 'node:crypto'
import { ItemStatus, Prisma } from '@prisma/client'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { deleteImages, saveImage } from '../services/storage.service.js'
import { ITEM_CATEGORIES, sanitizeText, serializeItem, type PublicOwner } from '../services/item.service.js'

const blockSchema = z.enum(['A', 'B', 'C', 'D', 'E'])
const categorySchema = z.enum(ITEM_CATEGORIES)
const conditionSchema = z.enum(['New', 'Good', 'Used'])
const textSchema = (minimum: number, maximum: number) => z.string().transform(sanitizeText).pipe(z.string().min(minimum).max(maximum))
const createSchema = z.object({
  title: textSchema(2, 100),
  description: textSchema(5, 2000),
  category: categorySchema,
  condition: conditionSchema,
  max_lend_days: z.coerce.number().int().min(1).max(365),
}).strict()
const patchSchema = z.object({
  title: textSchema(2, 100).optional(),
  description: textSchema(5, 2000).optional(),
  category: categorySchema.optional(),
  condition: conditionSchema.optional(),
  max_lend_days: z.coerce.number().int().min(1).max(365).optional(),
  status: z.nativeEnum(ItemStatus).optional(),
  remove_photos: z.union([z.array(z.string()), z.string()]).optional(),
}).strict()
const idSchema = z.string().uuid()
const listQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  category: categorySchema.optional(),
  block: blockSchema.optional(),
  floor: z.coerce.number().int().min(1).max(5).optional(),
  available: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict()

const ownerSelect = { id: true, name: true, block: true, floor: true, avatarUrl: true, trustScore: true } as const
const itemInclude = { owner: { select: ownerSelect } } as const
const files = (req: Parameters<RequestHandler>[0]) => (req.files ?? []) as Express.Multer.File[]

function parseRemovePhotos(value: unknown): string[] {
  if (value === undefined) return []
  let parsed: unknown = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) as unknown } catch { throw new HttpError(400, 'Photo removals must be a JSON list.') }
  }
  return z.array(z.string().min(1).max(300)).max(3).parse(parsed)
}

export const listItems: RequestHandler = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query)
  const user = req.currentUser!
  const conditions: Prisma.Sql[] = [
    Prisma.sql`i.community_id = ${user.communityId}::uuid`,
    Prisma.sql`(i.status <> 'hidden' OR i.owner_id = ${user.id}::uuid)`,
  ]
  if (query.available === 'true') conditions.push(Prisma.sql`i.status = 'available'`)
  if (query.category) conditions.push(Prisma.sql`i.category = ${query.category}`)
  if (query.block) conditions.push(Prisma.sql`owner.block = ${query.block}`)
  if (query.floor) conditions.push(Prisma.sql`owner.floor = ${query.floor}`)
  const search = query.search.replace(/[%_\\]/g, '').trim()
  if (search) {
    const partial = `%${search}%`
    conditions.push(Prisma.sql`(
      to_tsvector('english', i.title || ' ' || i.description) @@ websearch_to_tsquery('english', ${search})
      OR i.title ILIKE ${partial} OR i.description ILIKE ${partial}
    )`)
  }
  const whereSql = Prisma.join(conditions, ' AND ')
  const skip = (query.page - 1) * 20
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string; community_id: string; owner_id: string; title: string; description: string; category: string;
      condition: string; photos: string[]; status: ItemStatus; max_lend_days: number; created_at: Date;
      owner_name: string; owner_block: string | null; owner_floor: number | null; owner_avatar_url: string | null; owner_trust_score: number;
    }>>(Prisma.sql`
      SELECT i.id, i.community_id, i.owner_id, i.title, i.description, i.category, i.condition, i.photos,
             i.status, i.max_lend_days, i.created_at,
             owner.name AS owner_name, owner.block AS owner_block, owner.floor AS owner_floor,
             owner.avatar_url AS owner_avatar_url, owner.trust_score AS owner_trust_score
      FROM items i JOIN users owner ON owner.id = i.owner_id
      WHERE ${whereSql}
      ORDER BY i.created_at DESC, i.id DESC
      LIMIT 20 OFFSET ${skip}
    `),
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM items i JOIN users owner ON owner.id = i.owner_id WHERE ${whereSql}
    `),
  ])
  const total = count[0]?.total ?? 0
  const items = rows.map((row) => {
    const item = {
      id: row.id,
      communityId: row.community_id,
      ownerId: row.owner_id,
      title: row.title,
      description: row.description,
      category: row.category,
      condition: row.condition,
      photos: row.photos,
      status: row.status,
      maxLendDays: row.max_lend_days,
      createdAt: row.created_at,
      owner: { id: row.owner_id, name: row.owner_name, block: row.owner_block, floor: row.owner_floor, avatarUrl: row.owner_avatar_url, trustScore: row.owner_trust_score } as PublicOwner,
    }
    return serializeItem(item, user.id)
  })
  res.json({ items, pagination: { page: query.page, pageSize: 20, total, hasMore: skip + rows.length < total } })
})

export const getItem: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  const item = await prisma.item.findFirst({
    where: { id, communityId: user.communityId, OR: [{ status: { not: 'hidden' } }, { ownerId: user.id }] },
    include: itemInclude,
  })
  if (!item) throw new HttpError(404, 'Item not found.')
  res.json({ item: serializeItem(item, user.id) })
})

export const getMyItems: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.currentUser!
  const items = await prisma.item.findMany({
    where: { ownerId: user.id, communityId: user.communityId },
    include: itemInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  res.json({ items: items.map((item) => serializeItem(item, user.id)) })
})

export const createItem: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.currentUser!
  const input = createSchema.parse(req.body)
  const uploadedFiles = files(req)
  if (uploadedFiles.length < 1 || uploadedFiles.length > 3) throw new HttpError(400, 'Choose between 1 and 3 photos.')
  const id = randomUUID()
  const photoPaths: string[] = []
  let item
  try {
    for (const photo of uploadedFiles) photoPaths.push(await saveImage(id, photo.buffer))
    const { max_lend_days: maxLendDays, ...itemFields } = input
    item = await prisma.item.create({
      data: {
        id, communityId: user.communityId, ownerId: user.id, ...itemFields,
        maxLendDays, photos: photoPaths,
      },
      include: itemInclude,
    })
  } catch (error) {
    await deleteImages(photoPaths)
    throw error
  }
  res.status(201).json({ item: serializeItem(item, user.id) })
})

export const updateItem: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  const uploadedFiles = files(req)
  const parsed = patchSchema.parse(req.body)
  const removePhotos = parseRemovePhotos(parsed.remove_photos)
  const { remove_photos: _removePhotos, ...fields } = parsed
  const input = fields
  if (!Object.keys(input).length && !removePhotos.length && !uploadedFiles.length) {
    throw new HttpError(400, 'Choose a field or photo change to save.')
  }

  const existing = await prisma.item.findFirst({
    where: { id, ownerId: user.id, communityId: user.communityId },
    include: itemInclude,
  })
  if (!existing) throw new HttpError(404, 'Item not found.')
  if (removePhotos.some((photoPath) => !existing.photos.includes(photoPath))) {
    throw new HttpError(400, 'One or more selected photos do not belong to this item.')
  }
  const nextPhotos = existing.photos.filter((photoPath) => !removePhotos.includes(photoPath))
  if (nextPhotos.length + uploadedFiles.length < 1) throw new HttpError(400, 'Keep at least one photo on this listing.')
  if (nextPhotos.length + uploadedFiles.length > 3) throw new HttpError(400, 'An item can have no more than 3 photos.')
  const addedPaths: string[] = []
  const { max_lend_days: maxLendDays, ...itemFields } = input
  let item
  try {
    for (const photo of uploadedFiles) addedPaths.push(await saveImage(id, photo.buffer))
    item = await prisma.item.update({
      where: { id },
      data: {
        ...itemFields,
        ...(maxLendDays === undefined ? {} : { maxLendDays }),
        photos: [...nextPhotos, ...addedPaths],
      },
      include: itemInclude,
    })
  } catch (error) {
    await deleteImages(addedPaths)
    throw error
  }
  await deleteImages(removePhotos)
  res.json({ item: serializeItem(item, user.id) })
})

export const deleteItem: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  const existing = await prisma.item.findFirst({
    where: { id, ownerId: user.id, communityId: user.communityId },
    select: { id: true, photos: true },
  })
  if (!existing) throw new HttpError(404, 'Item not found.')
  const activeRequests = await prisma.borrowRequest.count({ where: { itemId: id, status: 'accepted' } })
  if (activeRequests) throw new HttpError(409, 'This item cannot be deleted while an accepted request is active.')
  const deleted = await prisma.item.deleteMany({ where: { id, ownerId: user.id, communityId: user.communityId } })
  if (!deleted.count) throw new HttpError(404, 'Item not found.')
  await deleteImages(existing.photos)
  res.status(204).end()
})

export const listCategories: RequestHandler = (_req, res) => {
  res.json({ categories: ITEM_CATEGORIES })
}
