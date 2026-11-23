import type { RequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
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
  category: categorySchema.optional(), level1: z.string().trim().min(1).max(40).optional(), floor: z.coerce.number().int().min(0).max(5).optional(),
  status: z.enum(['open', 'fulfilled', 'closed']).optional(), search: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1), mine: z.enum(['true', 'false']).default('false'),
}).strict()

function publicAuthor(user: any) {
  const member = user.memberships?.[0]
  const floor = member?.level1Value && /^\d+$/.test(member.level1Value) ? Number(member.level1Value) : null
  return { id: user.id, name: user.name, floor, room: member?.level2Value ?? null, level1Value: member?.level1Value ?? null, level2Value: member?.level2Value ?? null, trustScore: member?.trustScore ?? 0 }
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

const authorSelect = (communityId: string) => ({ id: true, name: true, memberships: { where: { communityId, status: 'active' as const }, select: { level1Value: true, level2Value: true, trustScore: true }, take: 1 } })
const responseCount = { _count: { select: { responses: true } } } as const

export const listWanted: RequestHandler = asyncHandler(async (req, res) => {
  const query = feedSchema.parse(req.query)
  const user = req.currentUser!
  const blockRecords = await prisma.userBlock.findMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] }, select: { blockerId: true, blockedId: true } })
  const hiddenUserIds = blockRecords.map((block) => block.blockerId === user.id ? block.blockedId : block.blockerId)
  const where: Prisma.WantedPostWhereInput = {
    communityId: user.communityId,
    authorId: query.mine === 'true' ? user.id : { notIn: hiddenUserIds },
    ...(query.mine === 'true' ? {} : { status: query.status ?? 'open' }),
    ...(query.mine === 'true' && query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...((query.level1 ?? (query.floor === undefined ? undefined : String(query.floor))) !== undefined ? { author: { memberships: { some: { communityId: user.communityId, status: 'active', level1Value: query.level1 ?? String(query.floor) } } } } : {}),
    ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { note: { contains: query.search, mode: 'insensitive' } }] } : {}),
  }
  const pageSize = 20
  const [posts, total] = await Promise.all([
    prisma.wantedPost.findMany({ where, include: { author: { select: authorSelect(user.communityId) }, ...responseCount, responses: { where: { responderId: user.id }, select: { responderId: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize, skip: (query.page - 1) * pageSize }),
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
      // Lock the user's row while checking the open-post cap. Returning the UUID
      // avoids PostgreSQL's `void` return type from advisory-lock functions.
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`)
      const openCount = await tx.wantedPost.count({ where: { communityId: user.communityId, authorId: user.id, status: 'open' } })
      if (openCount >= env.WANTED_MAX_OPEN_POSTS) {
        throw new HttpError(409, `You already have ${env.WANTED_MAX_OPEN_POSTS} open wanted posts. Close one before posting another.`)
      }
      return tx.wantedPost.create({ data: { authorId: user.id, communityId: user.communityId, title: input.title, category: input.category, note: input.note ?? '', neededBy: input.neededBy ? day(input.neededBy) : null }, include: { author: { select: authorSelect(user.communityId) }, ...responseCount, responses: { where: { responderId: user.id }, select: { responderId: true } } } })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2010') throw new HttpError(503, 'The wanted post could not be saved because the database could not lock your account. Please retry.')
      if (error.code === 'P2021' || error.code === 'P2022') throw new HttpError(503, 'The wanted board database is out of date. Apply the pending Prisma migrations and restart the API.')
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new HttpError(503, 'The wanted board database is unavailable. Please try again shortly.')
    }
    throw error
  }
  res.status(201).json({ post: serializePost(post, user.id) })
})

export const getWanted: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  const post = await prisma.wantedPost.findFirst({ where: { id, communityId: user.communityId }, include: { author: { select: authorSelect(user.communityId) }, ...responseCount, responses: { where: { communityId: user.communityId, responderId: user.id }, select: { id: true, responderId: true, message: true, createdAt: true } } } })
  if (!post) throw new HttpError(404, 'Wanted post not found.')
  const isAuthor = post.authorId === user.id
  const responses = isAuthor ? await prisma.wantedResponse.findMany({ where: { wantedPostId: id, communityId: user.communityId }, include: { responder: { select: { id: true, name: true, phone: true, memberships: { where: { communityId: user.communityId, status: 'active' }, select: { level1Value: true, level2Value: true, trustScore: true }, take: 1 } } } }, orderBy: { createdAt: 'asc' } }) : post.responses
  const visibleResponses = isAuthor ? responses.map((response: any) => ({ id: response.id, message: response.message, createdAt: response.createdAt, responder: { ...publicAuthor(response.responder), ...(post.status === 'fulfilled' && post.helperId === response.responderId ? { phone: response.responder.phone } : {}) } })) : []
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
      const blocked = await tx.userBlock.findFirst({ where: { OR: [{ blockerId: user.id, blockedId: post.authorId }, { blockerId: post.authorId, blockedId: user.id }] } })
      if (blocked) throw new HttpError(403, 'This member is unavailable.')
      const created = await tx.wantedResponse.create({ data: { communityId: user.communityId, wantedPostId: id, responderId: user.id, message: input.message ?? '' } })
      await tx.notification.create({ data: { communityId: user.communityId, userId: post.authorId, wantedPostId: id, type: 'wanted_response', message: `${user.name} can help with ${post.title}.` } })
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
      const response = await tx.wantedResponse.findFirst({ where: { id: responseId, communityId: user.communityId, wantedPostId: id }, select: { responderId: true } })
      if (!response) throw new HttpError(400, 'Choose a responder on this post.')
      helperId = response.responderId
    }
    await tx.wantedPost.updateMany({ where: { id, communityId: user.communityId }, data: { status: 'fulfilled', helperId } })
    if (helperId) await tx.notification.create({ data: { communityId: user.communityId, userId: helperId, wantedPostId: id, type: 'wanted_helper_selected', message: `${user.name} marked you as the helper for their wanted post.` } })
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
