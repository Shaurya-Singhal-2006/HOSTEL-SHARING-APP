import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { toCurrentUser } from '../services/google-auth.service.js'

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  block: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  floor: z.number().int().min(1).max(5).optional(),
  room: z.string().trim().min(1).max(30).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one profile field.')

export const getMe: RequestHandler = (req, res, next) => {
  if (!req.currentUser) return next(new HttpError(401, 'Sign in to continue.'))
  return res.json({ user: toCurrentUser(req.currentUser) })
}

export const patchMe: RequestHandler = asyncHandler(async (req, res) => {
  const patch = updateProfileSchema.parse(req.body)
  const currentUser = req.currentUser
  if (!currentUser) throw new HttpError(401, 'Sign in to continue.')

  const data: { name?: string; block?: string; floor?: number; room?: string; phone?: string | null } = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.block !== undefined) data.block = patch.block
  if (patch.floor !== undefined) data.floor = patch.floor
  if (patch.room !== undefined) data.room = patch.room
  if (patch.phone !== undefined) data.phone = patch.phone || null

  const user = await prisma.user.update({ where: { id: currentUser.id }, data })
  return res.json({ user: toCurrentUser(user) })
})
