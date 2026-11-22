import type { RequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { sanitizeText } from '../services/item.service.js'

const ratingSchema = z.object({ requestId: z.string().uuid(), thumbsUp: z.boolean(), comment: z.string().max(150).optional().transform((value) => value ? sanitizeText(value) : '') }).strict()
export const createRating: RequestHandler = asyncHandler(async (req, res) => {
  const input = ratingSchema.parse(req.body), userId = req.currentUser!.id, communityId = req.activeCommunity!.id
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findFirst({ where: { id: input.requestId, communityId }, select: { status: true, borrowerId: true, ownerId: true, returnedAt: true } })
      if (!request) throw new HttpError(404, 'Borrow request not found.')
      if (request.status !== 'returned' || !request.returnedAt) throw new HttpError(409, 'You can rate this exchange after it is returned.')
      if (![request.borrowerId, request.ownerId].includes(userId)) throw new HttpError(403, 'Only people in this exchange can rate it.')
      const toUserId = request.borrowerId === userId ? request.ownerId : request.borrowerId
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM community_members WHERE community_id = ${communityId}::uuid AND user_id = ${toUserId}::uuid FOR UPDATE`)
      await tx.rating.create({ data: { communityId, requestId: input.requestId, fromUserId: userId, toUserId, thumbsUp: input.thumbsUp, comment: input.comment || null } })
      const ratings = await tx.rating.findMany({ where: { communityId, toUserId }, select: { thumbsUp: true } })
      const trustScore = Math.max(0, ratings.reduce((score, rating) => score + (rating.thumbsUp ? 1 : -1), 0))
      await tx.communityMember.update({ where: { communityId_userId: { communityId, userId: toUserId } }, data: { trustScore } })
      return { trustScore }
    })
    res.status(201).json({ ok: true, ...summary })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') throw new HttpError(409, 'You have already rated this exchange.')
    throw error
  }
})

export const getReputation: RequestHandler = asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id), communityId = req.activeCommunity!.id
  const membership = await prisma.communityMember.findFirst({ where: { userId: id, communityId, status: 'active' }, include: { user: { select: { id: true, name: true, avatarUrl: true } } } })
  if (!membership) throw new HttpError(404, 'Member not found.')
  const [ups, downs, lends, borrows, comments] = await Promise.all([
    prisma.rating.count({ where: { communityId, toUserId: id, thumbsUp: true } }), prisma.rating.count({ where: { communityId, toUserId: id, thumbsUp: false } }),
    prisma.borrowRequest.count({ where: { communityId, ownerId: id, status: 'returned' } }), prisma.borrowRequest.count({ where: { communityId, borrowerId: id, status: 'returned' } }),
    prisma.rating.findMany({ where: { communityId, toUserId: id, comment: { not: null, notIn: [''] } }, orderBy: { createdAt: 'desc' }, take: 5, select: { comment: true, createdAt: true, thumbsUp: true, fromUser: { select: { id: true, name: true, avatarUrl: true } } } }),
  ])
  const total = ups + downs
  const badges = [...(lends === 0 ? ['New member'] : []), ...(ups >= 5 && total > 0 && downs / total < 0.1 ? ['Reliable'] : []), ...(lends >= 10 ? ['Top lender'] : [])]
  res.json({ reputation: { ...membership.user, level1Value: membership.level1Value, thumbsUp: ups, thumbsDown: downs, trustScore: membership.trustScore, totalCompletedLends: lends, totalBorrows: borrows, badges, recentComments: comments.map((rating) => ({ ...rating, commenter: rating.fromUser })) } })
})

export const getLeaderboard: RequestHandler = asyncHandler(async (req, res) => {
  const members = await prisma.communityMember.findMany({ where: { communityId: req.activeCommunity!.id, status: 'active' }, include: { user: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: [{ trustScore: 'desc' }, { joinedAt: 'asc' }], take: 20 })
  res.json({ members: members.map((m) => ({ ...m.user, trustScore: m.trustScore, level1Value: m.level1Value })) })
})
