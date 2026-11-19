import type { RequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { ITEM_CATEGORIES, sanitizeText } from '../services/item.service.js'

const idSchema = z.string().uuid()
const categorySchema = z.enum(ITEM_CATEGORIES)
const day = (value: string) => new Date(`${value}T00:00:00.000Z`)
const today = () => new Date().toISOString().slice(0, 10)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(day(value).getTime()) && day(value).toISOString().slice(0, 10) === value)
const createSchema = z.object({
  title: z.string().transform(sanitizeText).pipe(z.string().min(1).max(80)),
  category: categorySchema,
  note: z.string().max(300).optional().transform((value) => value ? sanitizeText(value) : ''),
  neededBy: dateSchema.optional().nullable(),
}).strict()
const respondSchema = z.object({ message: z.string().max(200).optional().transform((value) => value ? sanitizeText(value) : '') }).strict()
const feedSchema = z.object({
  category: categorySchema.optional(), floor: z.coerce.number().int().min(0).max(5).optional(),
  status: z.enum(['open', 'fulfilled', 'closed']).optional(), search: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1), mine: z.enum(['true', 'false']).default('false'),
}).strict()

function publicAuthor(user: { id: string; name: string; floor: number | null; room: string | null; trustScore: number }) {
  return { id: user.id, name: user.name, floor: user.floor, room: user.room, trustScore: user.trustScore }
}
function serializePost(post: any, viewerId: string) {
  return {
    id: post.id, title: post.title, category: post.category, note: post.note,
    neededBy: post.neededBy?.toISOString().slice(0, 10) ?? null, status: post.status,
    isExpired: Boolean(post.neededBy && post.neededBy < day(today())), createdAt: post.createdAt,
    author: publicAuthor(post.author), responseCount: post._count?.responses ?? post.responses.length,
    hasResponded: post.responses?.some((response: any) => response.responderId === viewerId) ?? false,
    isAuthor: post.authorId === viewerId,
  }
}

const authorSelect = { id: true, name: true, floor: true, room: true, trustScore: true } as const
const responseCount = { _count: { select: { responses: true } } } as const

export const listWanted: RequestHandler = asyncHandler(async (req, res) => {
  const query = feedSchema.parse(req.query)
  const user = req.currentUser!
  const where: Prisma.WantedPostWhereInput = {
    communityId: user.communityId,
    ...(query.mine === 'true' ? { authorId: user.id } : { status: query.status ?? 'open' }),
    ...(query.mine === 'true' && query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.floor !== undefined ? { author: { floor: query.floor } } : {}),
    ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { note: { contains: query.search, mode: 'insensitive' } }] } : {}),
  }
  const pageSize = 20
  const [posts, total] = await Promise.all([
    prisma.wantedPost.findMany({ where, include: { author: { select: authorSelect }, ...responseCount, responses: { where: { responderId: user.id }, select: { responderId: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize, skip: (query.page - 1) * pageSize }),
    prisma.wantedPost.count({ where }),
  ])
  res.json({ posts: posts.map((post) => serializePost(post, user.id)), pagination: { page: query.page, pageSize, total, hasMore: query.page * pageSize < total } })
})

export const createWanted: RequestHandler = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body)
  const user = req.currentUser!
  if (input.neededBy && input.neededBy < today()) throw new HttpError(400, 'Needed-by date must be today or later.')
  let post
  try {
    post = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`)
      const openCount = await tx.wantedPost.count({ where: { authorId: user.id, status: 'open' } })
      if (openCount >= 5) throw new HttpError(409, 'You can have up to five open wanted posts.')
      return tx.wantedPost.create({ data: { authorId: user.id, communityId: user.communityId, title: input.title, category: input.category, note: input.note ?? '', neededBy: input.neededBy ? day(input.neededBy) : null }, include: { author: { select: authorSelect }, ...responseCount, responses: { where: { responderId: user.id }, select: { responderId: true } } } })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010') throw new HttpError(503, 'Could not create your wanted post right now. Please retry.')
    throw error
  }
  res.status(201).json({ post: serializePost(post, user.id) })
})

export const getWanted: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  const post = await prisma.wantedPost.findFirst({ where: { id, communityId: user.communityId }, include: { author: { select: authorSelect }, ...responseCount, responses: { where: { responderId: user.id }, select: { id: true, responderId: true, message: true, createdAt: true } } } })
  if (!post) throw new HttpError(404, 'Wanted post not found.')
  const isAuthor = post.authorId === user.id
  const responses = isAuthor ? await prisma.wantedResponse.findMany({ where: { wantedPostId: id }, include: { responder: { select: { id: true, name: true, floor: true, room: true, trustScore: true, phone: true } } }, orderBy: { createdAt: 'asc' } }) : post.responses
  const visibleResponses = isAuthor ? responses.map((response: any) => ({ id: response.id, message: response.message, createdAt: response.createdAt, responder: { ...publicAuthor(response.responder), ...(post.status === 'open' || (post.status === 'fulfilled' && post.helperId === response.responderId) ? { phone: response.responder.phone } : {}) } })) : []
  res.json({ post: { ...serializePost({ ...post, responses: post.responses }, user.id), responses: visibleResponses, myResponse: isAuthor ? null : (post.responses[0] ? { id: post.responses[0].id, message: post.responses[0].message, createdAt: post.responses[0].createdAt } : null) } })
})

export const respondWanted: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const input = respondSchema.parse(req.body ?? {})
  const user = req.currentUser!
  try {
    const response = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM wanted_posts WHERE id = ${id}::uuid FOR UPDATE`)
      if (!locked.length) throw new HttpError(404, 'Wanted post not found.')
      const post = await tx.wantedPost.findFirst({ where: { id, communityId: user.communityId }, select: { id: true, authorId: true, title: true, status: true, neededBy: true } })
      if (!post) throw new HttpError(404, 'Wanted post not found.')
      if (post.authorId === user.id) throw new HttpError(400, 'You cannot respond to your own post.')
      if (post.status !== 'open') throw new HttpError(409, 'This wanted post is no longer open.')
      if (post.neededBy && post.neededBy < day(today())) throw new HttpError(409, 'This wanted post has expired.')
      const created = await tx.wantedResponse.create({ data: { wantedPostId: id, responderId: user.id, message: input.message ?? '' } })
      await tx.notification.create({ data: { userId: post.authorId, wantedPostId: id, type: 'wanted_response', message: `${user.name} can help with ${post.title}.` } })
      return created
    })
    res.status(201).json({ response })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new HttpError(409, 'You have already responded to this post.')
    throw error
  }
})

export const fulfillWanted: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const schema = z.object({ responseId: z.string().uuid().optional().nullable() }).strict()
  const { responseId } = schema.parse(req.body ?? {})
  const user = req.currentUser!
  await prisma.$transaction(async (tx) => {
    const post = await tx.wantedPost.findFirst({ where: { id, communityId: user.communityId, authorId: user.id }, select: { id: true, status: true } })
    if (!post) throw new HttpError(404, 'Wanted post not found.')
    if (post.status !== 'open') throw new HttpError(409, 'Only open posts can be fulfilled.')
    let helperId: string | null = null
    if (responseId) {
      const response = await tx.wantedResponse.findFirst({ where: { id: responseId, wantedPostId: id }, select: { responderId: true } })
      if (!response) throw new HttpError(400, 'Choose a responder on this post.')
      helperId = response.responderId
    }
    await tx.wantedPost.update({ where: { id }, data: { status: 'fulfilled', helperId } })
    if (helperId) await tx.notification.create({ data: { userId: helperId, wantedPostId: id, type: 'wanted_helper_selected', message: `${user.name} marked you as the helper for their wanted post.` } })
  })
  res.json({ ok: true })
})

export const closeWanted: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const result = await prisma.wantedPost.updateMany({ where: { id, communityId: req.currentUser!.communityId, authorId: req.currentUser!.id, status: 'open' }, data: { status: 'closed' } })
  if (!result.count) throw new HttpError(404, 'Open wanted post not found.')
  res.json({ ok: true })
})

export const deleteWanted: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const result = await prisma.wantedPost.deleteMany({ where: { id, communityId: req.currentUser!.communityId, authorId: req.currentUser!.id } })
  if (!result.count) throw new HttpError(404, 'Wanted post not found.')
  res.json({ ok: true })
})
