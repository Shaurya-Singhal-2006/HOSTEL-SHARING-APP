import { createHash, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { toCurrentUser } from '../services/google-auth.service.js'

const joinSchema = z.object({ code: z.string().trim().min(1).max(128) }).strict()

function inviteMatches(provided: string): boolean {
  const expectedHash = createHash('sha256').update(env.HOSTEL_INVITE_CODE).digest()
  const providedHash = createHash('sha256').update(provided).digest()
  return timingSafeEqual(expectedHash, providedHash)
}

export const joinHostel: RequestHandler = asyncHandler(async (req, res) => {
  const { code } = joinSchema.parse(req.body)
  if (!inviteMatches(code)) throw new HttpError(400, 'That invite code is not valid.')
  const currentUser = req.currentUser
  if (!currentUser) throw new HttpError(401, 'Sign in to continue.')

  const user = await prisma.user.update({ where: { id: currentUser.id }, data: { joinedHostel: true } })
  return res.json({ user: toCurrentUser(user) })
})
