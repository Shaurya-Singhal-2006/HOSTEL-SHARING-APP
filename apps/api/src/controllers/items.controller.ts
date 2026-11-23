import { randomUUID } from 'node:crypto'
import { ItemStatus, Prisma } from '@prisma/client'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { deleteImages, saveImage } from '../services/storage.service.js'
import { ITEM_CATEGORIES, serializeItem, type PublicOwner } from '../services/item.service.js'
import { createItemSchema, itemIdSchema, itemListQuerySchema, updateItemSchema } from './items.schema.js'

const itemInclude = (communityId: string) => ({ owner: { select: { id: true, name: true, avatarUrl: true, memberships: { where: { communityId, status: 'active' as const }, select: { level1Value: true, level2Value: true, trustScore: true }, take: 1 } } } })
function serializeCommunityItem(item: any, viewerId: string) {
  const membership = item.owner?.memberships?.[0]
  return serializeItem({ ...item, owner: { ...item.owner, floor: membership?.level1Value && /^\d+$/.test(membership.level1Value) ? Number(membership.level1Value) : null, room: membership?.level2Value ?? null, level1Value: membership?.level1Value ?? null, level2Value: membership?.level2Value ?? null, trustScore: membership?.trustScore ?? 0 } }, viewerId)
}
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
  const query = itemListQuerySchema.parse(req.query)
  const user = req.currentUser!
  const blocks = await prisma.userBlock.findMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] }, select: { blockerId: true, blockedId: true } })
  const hiddenOwners = blocks.map((b) => b.blockerId === user.id ? b.blockedId : b.blockerId)
  const conditions: Prisma.Sql[] = [
    Prisma.sql`i.community_id = ${user.communityId}::uuid`,
    Prisma.sql`(i.status <> 'hidden' OR i.owner_id = ${user.id}::uuid)`,
  ]
  if (query.available === 'true') conditions.push(Prisma.sql`i.status = 'available'`)
  if (query.category) conditions.push(Prisma.sql`i.category = ${query.category}`)
  const level1Filter = query.level1 ?? (query.floor === undefined ? undefined : String(query.floor))
  if (level1Filter !== undefined) conditions.push(Prisma.sql`owner_membership.level1_value = ${level1Filter}`)
  if (hiddenOwners.length) conditions.push(Prisma.sql`i.owner_id NOT IN (${Prisma.join(hiddenOwners.map((id) => Prisma.sql`${id}::uuid`))})`)
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
      owner_name: string; owner_level1: string | null; owner_level2: string | null; owner_avatar_url: string | null; owner_trust_score: number;
    }>>(Prisma.sql`
      SELECT i.id, i.community_id, i.owner_id, i.title, i.description, i.category, i.condition, i.photos,
             i.status, i.max_lend_days, i.created_at,
      owner.name AS owner_name, owner_membership.level1_value AS owner_level1, owner_membership.level2_value AS owner_level2,
             owner.avatar_url AS owner_avatar_url, owner_membership.trust_score AS owner_trust_score
      FROM items i JOIN users owner ON owner.id = i.owner_id
      JOIN community_members owner_membership ON owner_membership.user_id = owner.id AND owner_membership.community_id = i.community_id AND owner_membership.status = 'active'
      WHERE ${whereSql}
      ORDER BY i.created_at DESC, i.id DESC
      LIMIT 20 OFFSET ${skip}
    `),
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM items i JOIN users owner ON owner.id = i.owner_id JOIN community_members owner_membership ON owner_membership.user_id = owner.id AND owner_membership.community_id = i.community_id AND owner_membership.status = 'active' WHERE ${whereSql}
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
      owner: { id: row.owner_id, name: row.owner_name, floor: row.owner_level1 !== null && /^\d+$/.test(row.owner_level1) ? Number(row.owner_level1) : null, room: row.owner_level2, level1Value: row.owner_level1, level2Value: row.owner_level2, avatarUrl: row.owner_avatar_url, trustScore: row.owner_trust_score } as PublicOwner,
    }
    return serializeItem(item, user.id)
  })
  res.json({ items, pagination: { page: query.page, pageSize: 20, total, hasMore: skip + rows.length < total } })
})

export const getItem: RequestHandler = asyncHandler(async (req, res) => {
  const id = itemIdSchema.parse(req.params.id)
  const user = req.currentUser!
  const item = await prisma.item.findFirst({
    where: { id, communityId: user.communityId, OR: [{ status: { not: 'hidden' } }, { ownerId: user.id }], owner: { memberships: { some: { communityId: user.communityId, status: 'active' } } } },
    include: itemInclude(user.communityId),
  })
  if (!item) throw new HttpError(404, 'Item not found.')
  if (item.ownerId !== user.id && await prisma.userBlock.findFirst({ where: { OR: [{ blockerId: user.id, blockedId: item.ownerId }, { blockerId: item.ownerId, blockedId: user.id }] } })) throw new HttpError(404, 'Item not found.')
  res.json({ item: serializeCommunityItem(item, user.id) })
})

export const getMyItems: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.currentUser!
  const items = await prisma.item.findMany({
    where: { ownerId: user.id, communityId: user.communityId },
    include: itemInclude(user.communityId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  res.json({ items: items.map((item) => serializeCommunityItem(item, user.id)) })
})

export const getPopularItems: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.currentUser!
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const groups = await prisma.borrowRequest.groupBy({
    by: ['itemId'],
    where: { createdAt: { gte: since }, item: { communityId: user.communityId, status: { not: 'hidden' }, owner: { memberships: { some: { communityId: user.communityId, status: 'active' } } } } },
    _count: { _all: true },
    orderBy: { _count: { itemId: 'desc' } },
    take: 6,
  })
  const ids = groups.map((group) => group.itemId)
  const records = ids.length ? await prisma.item.findMany({ where: { id: { in: ids }, communityId: user.communityId, status: { not: 'hidden' }, owner: { memberships: { some: { communityId: user.communityId, status: 'active' } } } }, include: itemInclude(user.communityId) }) : []
  const byId = new Map(records.map((item) => [item.id, item]))
  const items = groups.flatMap((group) => {
    const item = byId.get(group.itemId)
    return item ? [{ ...serializeCommunityItem(item, user.id), requestCount: group._count._all }] : []
  })
  res.json({ items })
})

export const createItem: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.currentUser!
  const input = createItemSchema.parse(req.body)
  const uploadedFiles = files(req)
  if (uploadedFiles.length > 3) throw new HttpError(400, 'Choose no more than 3 photos.')
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
      include: itemInclude(user.communityId),
    })
  } catch (error) {
    await deleteImages(photoPaths)
    throw error
  }
  res.status(201).json({ item: serializeCommunityItem(item, user.id) })
})

export const updateItem: RequestHandler = asyncHandler(async (req, res) => {
  const id = itemIdSchema.parse(req.params.id)
  const user = req.currentUser!
  const uploadedFiles = files(req)
  const parsed = updateItemSchema.parse(req.body)
  const removePhotos = parseRemovePhotos(parsed.remove_photos)
  const { remove_photos: _removePhotos, ...fields } = parsed
  const input = fields
  if (!Object.keys(input).length && !removePhotos.length && !uploadedFiles.length) {
    throw new HttpError(400, 'Choose a field or photo change to save.')
  }

  const existing = await prisma.item.findFirst({
    where: { id, ownerId: user.id, communityId: user.communityId },
    include: itemInclude(user.communityId),
  })
  if (!existing) throw new HttpError(404, 'Item not found.')
  if (removePhotos.some((photoPath) => !existing.photos.includes(photoPath))) {
    throw new HttpError(400, 'One or more selected photos do not belong to this item.')
  }
  const nextPhotos = existing.photos.filter((photoPath) => !removePhotos.includes(photoPath))
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
      include: itemInclude(user.communityId),
    })
  } catch (error) {
    await deleteImages(addedPaths)
    throw error
  }
  await deleteImages(removePhotos)
  res.json({ item: serializeCommunityItem(item, user.id) })
})

export const deleteItem: RequestHandler = asyncHandler(async (req, res) => {
  const id = itemIdSchema.parse(req.params.id)
  const user = req.currentUser!
  const existing = await prisma.item.findFirst({
    where: { id, ownerId: user.id, communityId: user.communityId },
    select: { id: true, photos: true },
  })
  if (!existing) throw new HttpError(404, 'Item not found.')
  const activeRequests = await prisma.borrowRequest.count({ where: { communityId: user.communityId, itemId: id, status: 'accepted' } })
  if (activeRequests) throw new HttpError(409, 'This item cannot be deleted while an accepted request is active.')
  const deleted = await prisma.item.deleteMany({ where: { id, ownerId: user.id, communityId: user.communityId } })
  if (!deleted.count) throw new HttpError(404, 'Item not found.')
  await deleteImages(existing.photos)
  res.status(204).end()
})

export const listCategories: RequestHandler = (_req, res) => {
  res.json({ categories: ITEM_CATEGORIES })
}
