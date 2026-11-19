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
  if (!req.currentUser?.joinedHostel) return next(new HttpError(403, 'Join the hostel to continue.'))
  next()
}

export const requireCompleteProfile: RequestHandler = (req, _res, next) => {
  const user = req.currentUser
  const complete = Boolean(
    user?.name.trim() && user.floor !== null && user.floor >= 0 && user.floor <= 5 &&
    /^[A-Z][0-9]{1,3}$/.test(user.room?.trim().toUpperCase() ?? ''),
  )
  if (!complete) return next(new HttpError(403, 'Complete your profile to continue.'))
  next()
}
