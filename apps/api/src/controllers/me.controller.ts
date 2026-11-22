import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { toCurrentUser } from '../services/google-auth.service.js'

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  floor: z.number().int().min(0).max(5).optional(),
  room: z.string().trim().toUpperCase().regex(/^[A-Z][0-9]{1,3}$/, 'Enter your room like B2 or B16').optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  onboardingTourCompleted: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one profile field.')

export const getMe: RequestHandler = (req, res, next) => {
  if (!req.currentUser) return next(new HttpError(401, 'Sign in to continue.'))
  return res.json({ user: toCurrentUser(req.currentUser) })
}

export const patchMe: RequestHandler = asyncHandler(async (req, res) => {
  const patch = updateProfileSchema.parse(req.body)
  const currentUser = req.currentUser
  if (!currentUser) throw new HttpError(401, 'Sign in to continue.')
  if (patch.floor !== undefined || patch.room !== undefined) throw new HttpError(400, 'Location is community-specific. Update it at PATCH /api/communities/:id/me with X-Community-Id.')

  const data: { name?: string; phone?: string | null; onboardingTourCompleted?: boolean } = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.phone !== undefined) data.phone = patch.phone || null
  if (patch.onboardingTourCompleted !== undefined) data.onboardingTourCompleted = patch.onboardingTourCompleted

  const user = await prisma.user.update({ where: { id: currentUser.id }, data })
  return res.json({ user: toCurrentUser(user) })
})
