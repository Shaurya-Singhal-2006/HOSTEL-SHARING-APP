import { Prisma } from '@prisma/client'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { getPublicUrl } from '../services/storage.service.js'
import { sanitizeText } from '../services/item.service.js'

const createSchema = z.object({
  itemId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(300).optional().transform((value) => value ? sanitizeText(value) : ''),
}).strict()
const idSchema = z.string().uuid()
const statusSchema = z.enum(['pending', 'accepted', 'declined', 'cancelled', 'returned'])
const declineSchema = z.object({ reason: z.string().max(200).optional().transform((value) => value ? sanitizeText(value) : '') }).strict()
const todayUtc = () => new Date().toISOString().slice(0, 10)
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`)
const validDate = (value: string) => !Number.isNaN(dateValue(value).getTime()) && dateValue(value).toISOString().slice(0, 10) === value
const daysBetween = (from: string, to: string) => (dateValue(to).getTime() - dateValue(from).getTime()) / 86_400_000 + 1

function serializeRequest(request: any, viewerId: string) {
  const other = request.borrowerId === viewerId ? request.owner : request.borrower
  const membership = other.memberships?.[0]
  const floor = membership?.level1Value && /^\d+$/.test(membership.level1Value) ? Number(membership.level1Value) : null
  return {
    id: request.id,
    item: {
      id: request.item.id, title: request.item.title, category: request.item.category,
      photos: request.item.photos.map((path: string) => ({ path, url: getPublicUrl(path), thumbnailUrl: getPublicUrl(path, true) })),
    },
    fromDate: request.fromDate.toISOString().slice(0, 10),
    toDate: request.toDate.toISOString().slice(0, 10),
    note: request.note,
    declineReason: request.declineReason,
    status: request.status,
    isOverdue: request.status === 'accepted' && request.toDate < dateValue(todayUtc()),
    createdAt: request.createdAt,
    other: { id: other.id, name: other.name, floor, room: membership?.level2Value ?? null, ...(request.status === 'accepted' ? { phone: other.phone } : {}) },
    isBorrower: request.borrowerId === viewerId,
    myRated: request.ratings?.some((rating: any) => rating.fromUserId === viewerId) ?? false,
    otherRated: request.ratings?.some((rating: any) => rating.fromUserId === other.id) ?? false,
    myRating: request.ratings?.find((rating: any) => rating.fromUserId === viewerId) ?? null,
  }
}

const includeRequest = (communityId: string) => ({
  item: { select: { id: true, title: true, category: true, photos: true } },
  borrower: { select: { id: true, name: true, phone: true, memberships: { where: { communityId, status: 'active' as const }, select: { level1Value: true, level2Value: true, trustScore: true }, take: 1 } } },
  owner: { select: { id: true, name: true, phone: true, memberships: { where: { communityId, status: 'active' as const }, select: { level1Value: true, level2Value: true, trustScore: true }, take: 1 } } },
  ratings: { select: { fromUserId: true, thumbsUp: true, comment: true } },
})

export const createRequest: RequestHandler = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body)
  const user = req.currentUser!
  if (!validDate(input.fromDate) || !validDate(input.toDate) || input.fromDate < todayUtc() || input.toDate < input.fromDate) throw new HttpError(400, 'Choose a valid date range starting today or later.')
  const item = await prisma.item.findFirst({ where: { id: input.itemId, communityId: user.communityId }, select: { id: true, ownerId: true, status: true, maxLendDays: true, title: true } })
  if (!item) throw new HttpError(404, 'Item not found.')
  if (item.ownerId === user.id) throw new HttpError(400, 'You cannot request your own item.')
  if (await prisma.userBlock.findFirst({ where: { OR: [{ blockerId: user.id, blockedId: item.ownerId }, { blockerId: item.ownerId, blockedId: user.id }] } })) throw new HttpError(403, 'This member is unavailable.')
  if (item.status !== 'available') throw new HttpError(409, 'This item is not available right now.')
  if (daysBetween(input.fromDate, input.toDate) > item.maxLendDays) throw new HttpError(400, `Choose no more than ${item.maxLendDays} days.`)
  let id: string
  try {
    id = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM items WHERE id = ${item.id}::uuid FOR UPDATE`)
    const lockedItem = await tx.item.findFirst({ where: { id: item.id, communityId: user.communityId }, select: { ownerId: true, status: true, maxLendDays: true, title: true } })
    if (!lockedItem) throw new HttpError(404, 'Item not found.')
    if (lockedItem.ownerId === user.id) throw new HttpError(400, 'You cannot request your own item.')
    if (lockedItem.status !== 'available') throw new HttpError(409, 'This item is not available right now.')
    if (daysBetween(input.fromDate, input.toDate) > lockedItem.maxLendDays) throw new HttpError(400, `Choose no more than ${lockedItem.maxLendDays} days.`)
    const active = await tx.borrowRequest.findFirst({ where: { communityId: user.communityId, itemId: item.id, borrowerId: user.id, status: { in: ['pending', 'accepted'] } } })
    if (active) throw new HttpError(409, 'You already have an active request for this item.')
    const request = await tx.borrowRequest.create({ data: { communityId: user.communityId, itemId: item.id, borrowerId: user.id, ownerId: item.ownerId, fromDate: dateValue(input.fromDate), toDate: dateValue(input.toDate), note: input.note ?? '' } })
    await tx.notification.create({ data: { communityId: user.communityId, userId: lockedItem.ownerId, requestId: request.id, type: 'request_made', message: `${user.name} requested ${lockedItem.title}.` } })
    return request.id
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new HttpError(409, 'You already have an active request for this item.')
    throw error
  }
  const request = await prisma.borrowRequest.findFirstOrThrow({ where: { id, communityId: user.communityId }, include: includeRequest(user.communityId) })
  res.status(201).json({ request: serializeRequest(request, user.id) })
})

export const listRequests: RequestHandler = asyncHandler(async (req, res) => {
  const query = z.object({ role: z.enum(['borrower', 'owner']).default('borrower'), status: statusSchema.optional() }).strict().parse(req.query)
  const user = req.currentUser!
  const requests = await prisma.borrowRequest.findMany({
    where: { communityId: user.communityId, [query.role === 'borrower' ? 'borrowerId' : 'ownerId']: user.id, ...(query.status ? { status: query.status } : {}) },
    include: includeRequest(user.communityId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  res.json({ requests: requests.map((request) => serializeRequest(request, user.id)) })
})

export const getRequest: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  const request = await prisma.borrowRequest.findFirst({ where: { id, communityId: user.communityId, OR: [{ borrowerId: user.id }, { ownerId: user.id }] }, include: includeRequest(user.communityId) })
  if (!request) throw new HttpError(404, 'Request not found.')
  res.json({ request: serializeRequest(request, user.id) })
})

async function getOwnedPending(tx: Prisma.TransactionClient, id: string, ownerId: string, communityId: string) {
  const request = await tx.borrowRequest.findFirst({ where: { id, communityId, ownerId }, select: { id: true, itemId: true, borrowerId: true, fromDate: true, toDate: true, status: true, item: { select: { title: true } } } })
  if (!request) throw new HttpError(404, 'Request not found.')
  if (request.status !== 'pending') throw new HttpError(409, 'Only pending requests can be changed.')
  return request
}

export const acceptRequest: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  await prisma.$transaction(async (tx) => {
    const target = await getOwnedPending(tx, id, user.id, user.communityId)
    const lockedItems = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM items WHERE id = ${target.itemId}::uuid FOR UPDATE`)
    const overlap = await tx.borrowRequest.findFirst({ where: { communityId: user.communityId, itemId: target.itemId, status: 'accepted', id: { not: id }, fromDate: { lte: target.toDate }, toDate: { gte: target.fromDate } }, select: { id: true } })
    if (overlap) throw new HttpError(409, 'Those dates overlap another accepted request.')
    if (lockedItems[0]?.status !== 'available') throw new HttpError(409, 'This item is no longer available to accept.')
    const updated = await tx.borrowRequest.updateMany({ where: { id, communityId: user.communityId, ownerId: user.id, status: 'pending' }, data: { status: 'accepted' } })
    if (!updated.count) throw new HttpError(409, 'This request has already changed.')
    await tx.item.update({ where: { id: target.itemId }, data: { status: 'lent' } })
    const otherPending = await tx.borrowRequest.findMany({ where: { communityId: user.communityId, itemId: target.itemId, id: { not: id }, status: 'pending', fromDate: { lte: target.toDate }, toDate: { gte: target.fromDate } }, select: { id: true, borrowerId: true } })
    for (const pending of otherPending) {
      await tx.borrowRequest.update({ where: { id: pending.id }, data: { status: 'declined', declineReason: 'Overlapping request accepted.' } })
      await tx.notification.create({ data: { communityId: user.communityId, userId: pending.borrowerId, requestId: pending.id, type: 'request_declined', message: `A different request was accepted for ${target.item.title}.` } })
    }
    await tx.notification.create({ data: { communityId: user.communityId, userId: target.borrowerId, requestId: id, type: 'request_accepted', message: `Your request for ${target.item.title} was accepted.` } })
  })
  const request = await prisma.borrowRequest.findFirstOrThrow({ where: { id, communityId: user.communityId }, include: includeRequest(user.communityId) })
  res.json({ request: serializeRequest(request, user.id) })
})

export const declineRequest: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const { reason } = declineSchema.parse(req.body ?? {})
  const user = req.currentUser!
  const request = await prisma.$transaction(async (tx) => {
    const pending = await getOwnedPending(tx, id, user.id, user.communityId)
    const update = await tx.borrowRequest.updateMany({ where: { id, communityId: user.communityId, ownerId: user.id, status: 'pending' }, data: { status: 'declined', declineReason: reason || null } })
    if (!update.count) throw new HttpError(409, 'This request has already changed.')
    await tx.notification.create({ data: { communityId: user.communityId, userId: pending.borrowerId, requestId: id, type: 'request_declined', message: `Your request for ${pending.item.title} was declined.` } })
    return true
  })
  void request
  const result = await prisma.borrowRequest.findFirstOrThrow({ where: { id, communityId: user.communityId }, include: includeRequest(user.communityId) })
  res.json({ request: serializeRequest(result, user.id) })
})

export const cancelRequest: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  await prisma.$transaction(async (tx) => {
    const request = await tx.borrowRequest.findFirst({ where: { id, communityId: user.communityId, borrowerId: user.id }, select: { status: true, itemId: true, ownerId: true, item: { select: { title: true } } } })
    if (!request) throw new HttpError(404, 'Request not found.')
    await tx.$queryRaw(Prisma.sql`SELECT id FROM items WHERE id = ${request.itemId}::uuid FOR UPDATE`)
    const current = await tx.borrowRequest.findFirst({ where: { id, communityId: user.communityId, borrowerId: user.id }, select: { status: true, ownerId: true, item: { select: { title: true } } } })
    if (!current || !['pending', 'accepted'].includes(current.status)) throw new HttpError(409, 'This request can no longer be cancelled.')
    const wasAccepted = current.status === 'accepted'
    await tx.borrowRequest.updateMany({ where: { id, communityId: user.communityId }, data: { status: 'cancelled' } })
    if (wasAccepted) await tx.item.update({ where: { id: request.itemId }, data: { status: 'available' } })
    await tx.notification.create({ data: { communityId: user.communityId, userId: current.ownerId, requestId: id, type: 'request_cancelled', message: `A borrower cancelled their request for ${current.item.title}.` } })
  })
  const result = await prisma.borrowRequest.findFirstOrThrow({ where: { id, communityId: user.communityId }, include: includeRequest(user.communityId) })
  res.json({ request: serializeRequest(result, user.id) })
})

export const returnRequest: RequestHandler = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id)
  const user = req.currentUser!
  await prisma.$transaction(async (tx) => {
    const request = await tx.borrowRequest.findFirst({ where: { id, communityId: user.communityId, ownerId: user.id }, select: { status: true, itemId: true, borrowerId: true, item: { select: { title: true } } } })
    if (!request) throw new HttpError(404, 'Request not found.')
    await tx.$queryRaw(Prisma.sql`SELECT id FROM items WHERE id = ${request.itemId}::uuid FOR UPDATE`)
    const current = await tx.borrowRequest.findFirst({ where: { id, communityId: user.communityId, ownerId: user.id }, select: { status: true, borrowerId: true, item: { select: { title: true } } } })
    if (!current || current.status !== 'accepted') throw new HttpError(409, 'Only accepted requests can be returned.')
    await tx.borrowRequest.updateMany({ where: { id, communityId: user.communityId }, data: { status: 'returned', returnedAt: new Date() } })
    await tx.item.update({ where: { id: request.itemId }, data: { status: 'available' } })
    await tx.notification.create({ data: { communityId: user.communityId, userId: current.borrowerId, requestId: id, type: 'request_returned', message: `${current.item.title} was marked returned.` } })
  })
  const result = await prisma.borrowRequest.findFirstOrThrow({ where: { id, communityId: user.communityId }, include: includeRequest(user.communityId) })
  res.json({ request: serializeRequest(result, user.id) })
})

export const listNotifications: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.currentUser!.id
  const communityId = req.activeCommunity!.id
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId, communityId }, orderBy: { createdAt: 'desc' }, take: 30, include: { request: { include: { item: { select: { id: true, title: true, category: true, photos: true } } } }, wantedPost: { select: { id: true, title: true, category: true } } } }),
    prisma.notification.count({ where: { userId, communityId, read: false } }),
  ])
  const wantedUnreadCount = await prisma.notification.count({ where: { userId, communityId, read: false, type: { in: ['wanted_response', 'wanted_helper_selected'] } } })
  res.json({ notifications: notifications.map((notification) => {
    const item = notification.request?.item
    return { id: notification.id, type: notification.type, requestId: notification.requestId, wantedPostId: notification.wantedPostId, message: notification.message, read: notification.read, createdAt: notification.createdAt, item: item ? { ...item, photos: item.photos.map((path) => ({ path, url: getPublicUrl(path), thumbnailUrl: getPublicUrl(path, true) })) } : notification.wantedPost ? { ...notification.wantedPost, photos: [] } : null }
  }), unreadCount, wantedUnreadCount })
})

export const readAllNotifications: RequestHandler = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.currentUser!.id, communityId: req.activeCommunity!.id, read: false }, data: { read: true } })
  res.json({ ok: true })
})
