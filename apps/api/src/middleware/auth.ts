import type { RequestHandler } from 'express'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { clearSessionCookie, readSession, SESSION_COOKIE } from '../lib/session.js'

export const requireAuth: RequestHandler = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE]
  const userId = typeof token === 'string' ? readSession(token) : null
  if (!userId) {
    clearSessionCookie(res)
    throw new HttpError(401, 'Sign in to continue.')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, communityId: true, name: true, email: true, avatarUrl: true, onboardingTourCompleted: true,
      joinedHostel: true, floor: true, room: true, phone: true, trustScore: true,
    },
  })
  if (!user) {
    clearSessionCookie(res)
    throw new HttpError(401, 'Sign in to continue.')
  }

  req.currentUser = user
  next()
})

export const requireJoined: RequestHandler = (req, _res, next) => {
  return requireCommunity(req, _res, next)
}

/** Resolve the explicit community context and reject inactive/non-member access without revealing it. */
export const requireCommunity: RequestHandler = asyncHandler(async (req, _res, next) => {
  const user = req.currentUser
  if (!user) throw new HttpError(401, 'Sign in to continue.')
  const id = req.get('X-Community-Id')?.trim()
  if (!id) throw new HttpError(400, 'Select a community with the X-Community-Id header.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(404, 'Community not found.')
  const member = await prisma.communityMember.findFirst({
    where: { communityId: id, userId: user.id, status: 'active', community: { isActive: true } },
    include: { community: { select: { id: true, name: true, level1Label: true, level2Label: true, level1Options: true, joinMode: true } } },
  })
  if (!member) throw new HttpError(404, 'Community not found.')
  if (req.params.id && req.params.id !== id) throw new HttpError(404, 'Community not found.')
  req.activeCommunity = member.community
  req.communityMember = { id: member.id, role: member.role, status: member.status, level1Value: member.level1Value, level2Value: member.level2Value, trustScore: member.trustScore }
  // Compatibility for existing controllers during the frontend transition.
  user.communityId = id
  user.floor = member.level1Value && /^\d+$/.test(member.level1Value) ? Number(member.level1Value) : null
  user.room = member.level2Value
  user.trustScore = member.trustScore
  next()
})

export const requireCompleteProfile: RequestHandler = (req, _res, next) => {
  const user = req.currentUser
  const community = req.activeCommunity
  const member = req.communityMember
  const level1Required = Boolean(community?.level1Label)
  const level2Required = Boolean(community?.level2Label)
  const complete = Boolean(user?.name.trim() && member &&
    (!level1Required || (member.level1Value && community!.level1Options.includes(member.level1Value))) &&
    (!level2Required || (member.level2Value && member.level2Value.trim().length <= 10)))
  if (!complete) return next(new HttpError(403, 'Complete your profile to continue.'))
  next()
}
