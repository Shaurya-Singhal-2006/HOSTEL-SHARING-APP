import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { issueSession, setSessionCookie } from '../lib/session.js'

const demoEmail = /^demo\d+@example\.test$/

export const listDemoUsers: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await prisma.user.findMany({
    where: { email: { endsWith: '@example.test' }, memberships: { some: { status: 'active', community: { isActive: true } } } },
    select: { id: true, name: true, email: true, memberships: { where: { status: 'active', community: { isActive: true } }, select: { community: { select: { id: true, name: true } } } } },
    orderBy: { name: 'asc' },
  })
  const users = rows.filter((user) => demoEmail.test(user.email)).map((user) => ({
    id: user.id, name: user.name, email: user.email,
    communities: user.memberships.map((membership) => membership.community),
  }))
  res.json({ users })
})

export const loginAsDemoUser: RequestHandler = asyncHandler(async (req, res) => {
  const { userId } = z.object({ userId: z.string().uuid() }).strict().parse(req.body)
  const user = await prisma.user.findFirst({
    where: { id: userId, email: { endsWith: '@example.test' }, memberships: { some: { status: 'active', community: { isActive: true } } } },
    select: { id: true, email: true },
  })
  if (!user || !demoEmail.test(user.email)) throw new HttpError(404, 'Demo account not found. Run the demo seed and choose one of its sample accounts.')
  setSessionCookie(res, issueSession(user.id))
  res.json({ ok: true })
})
