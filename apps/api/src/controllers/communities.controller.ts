import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { CommunityMemberStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { communityIdSchema, communityProfileSchema, createCommunitySchema, joinCommunitySchema, updateCommunitySchema } from './communities.schema.js'
import { recordAdminAction } from '../services/audit.service.js'

const inviteCode = () => randomBytes(4).toString('hex').toUpperCase()
// Community member listings are public within a community; never select or return private email addresses.
const safeMemberSelect = { user: { select: { id: true, name: true, avatarUrl: true } } } as const
const equalCode = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a.trim().toUpperCase()).digest(), createHash('sha256').update(b.trim().toUpperCase()).digest())
const assertAdmin = (req: import('express').Request) => { if (req.communityMember?.role !== 'admin') throw new HttpError(403, 'Community admin access required.') }

export const createCommunity: RequestHandler = asyncHandler(async (req, res) => {
  const input = createCommunitySchema.parse(req.body)
  const userId = req.currentUser!.id
  const count = await prisma.communityMember.count({ where: { userId, role: 'admin', status: 'active' } })
  if (count >= env.COMMUNITY_MAX_ADMIN_COMMUNITIES) throw new HttpError(409, `You can administer up to ${env.COMMUNITY_MAX_ADMIN_COMMUNITIES} communities. Leave or transfer one before creating another.`)
  const community = await prisma.$transaction(async (tx) => {
    const c = await tx.community.create({ data: { name: input.name, type: input.type, description: input.description, inviteCode: inviteCode(), createdBy: userId, joinMode: input.joinMode, icon: input.icon, accentColor: input.accentColor, level1Label: input.labels?.level1 ?? '', level2Label: input.labels?.level2 ?? '', level1Options: input.level1Options ?? [] } })
    await tx.communityMember.create({ data: { communityId: c.id, userId, role: 'admin', status: 'active', acceptedGuidelinesAt: new Date() } })
    return c
  })
  res.status(201).json({ community: { ...community, inviteCode: community.inviteCode, memberCount: 1 } })
})

export const myCommunities: RequestHandler = asyncHandler(async (req, res) => {
  const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).strict().parse(req.query)
  const where = { userId: req.currentUser!.id, community: { isActive: true } }
  const [memberships, total] = await Promise.all([
    prisma.communityMember.findMany({ where, include: { community: { select: { id: true, name: true, type: true, description: true, icon: true, accentColor: true, level1Label: true, level2Label: true, level1Options: true, joinMode: true, isActive: true, _count: { select: { members: { where: { status: 'active' } } } } } } }, orderBy: { joinedAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.communityMember.count({ where }),
  ])
  res.json({ communities: memberships.map((m) => ({ ...m.community, memberCount: m.community._count.members, _count: undefined, role: m.role, status: m.status, level1Value: m.level1Value, level2Value: m.level2Value })), pagination: { page: query.page, pageSize: query.limit, total, hasMore: query.page * query.limit < total } })
})

export const joinCommunity: RequestHandler = asyncHandler(async (req, res) => {
  const input = joinCommunitySchema.parse(req.body)
  const id = req.get('X-Community-Id')
  if (id && !communityIdSchema.safeParse(id).success) throw new HttpError(404, 'Community or invite code not found.')
  const community = id
    ? await prisma.community.findFirst({ where: { id, isActive: true } })
    : await prisma.community.findUnique({ where: { inviteCode: input.inviteCode.trim().toUpperCase() } })
  if (!community || !community.isActive || !equalCode(input.inviteCode, community.inviteCode)) throw new HttpError(404, 'Community or invite code not found.')
  if (community.level1Options.length && input.level1 && !community.level1Options.includes(input.level1)) throw new HttpError(400, `Choose a valid ${community.level1Label}.`)
  const status = community.joinMode === 'approval_required' ? 'pending' : 'active'
  try {
    const existing = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: req.currentUser!.id } } })
    if (existing && existing.status !== 'removed') throw new HttpError(409, 'You have already joined or requested access to this community.')
    const member = existing
      ? await prisma.communityMember.update({ where: { id: existing.id }, data: { status, level1Value: input.level1 ?? null, level2Value: input.level2 ?? null, acceptedGuidelinesAt: new Date() } })
      : await prisma.communityMember.create({ data: { communityId: community.id, userId: req.currentUser!.id, status, level1Value: input.level1 ?? null, level2Value: input.level2 ?? null, acceptedGuidelinesAt: new Date() } })
    if (status === 'pending') {
      const admins = await prisma.communityMember.findMany({ where: { communityId: community.id, role: 'admin', status: 'active' }, select: { userId: true } })
      if (admins.length) await prisma.notification.createMany({ data: admins.map((admin) => ({ communityId: community.id, userId: admin.userId, type: 'community_join_request', message: `${req.currentUser!.name} requested to join ${community.name}.` })) })
    }
    res.status(status === 'active' ? 200 : 202).json({ status, membership: { communityId: community.id, status: member.status, level1Value: member.level1Value, level2Value: member.level2Value } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new HttpError(409, 'You have already joined or requested access to this community.')
    throw error
  }
})

export const getCommunity: RequestHandler = asyncHandler(async (req, res) => {
  const memberCount = await prisma.communityMember.count({ where: { communityId: req.activeCommunity!.id, status: 'active' } })
  res.json({ community: { ...req.activeCommunity, memberCount } })
})
export const updateCommunity: RequestHandler = asyncHandler(async (req, res) => {
  assertAdmin(req)
  const patch = updateCommunitySchema.parse(req.body)
  const community = await prisma.community.update({ where: { id: req.activeCommunity!.id }, data: patch })
  res.json({ community })
})
export const regenerateInvite: RequestHandler = asyncHandler(async (req, res) => {
  assertAdmin(req)
  const community = await prisma.$transaction(async (tx) => {
    const updated = await tx.community.update({ where: { id: req.activeCommunity!.id }, data: { inviteCode: inviteCode() }, select: { id: true, inviteCode: true } })
    await recordAdminAction(tx, { communityId: updated.id, actorId: req.currentUser!.id, action: 'regenerate_invite_code', targetType: 'community', targetId: updated.id })
    return updated
  })
  res.json({ community })
})
export const listMembers: RequestHandler = asyncHandler(async (req, res) => {
  const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict().parse(req.query)
  const status = req.communityMember!.role === 'admin' ? undefined : CommunityMemberStatus.active
  const where: Prisma.CommunityMemberWhereInput = { communityId: req.activeCommunity!.id, ...(status ? { status } : {}) }
  const [members, total] = await Promise.all([
    prisma.communityMember.findMany({ where, include: safeMemberSelect, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.communityMember.count({ where }),
  ])
  res.json({ members: members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, avatarUrl: m.user.avatarUrl, role: m.role, status: m.status, level1Value: m.level1Value, level2Value: m.level2Value, trustScore: m.trustScore, joinedAt: m.joinedAt })), pagination: { page: query.page, pageSize: query.limit, total, hasMore: query.page * query.limit < total } })
})
export const changeMember: RequestHandler = asyncHandler(async (req, res) => {
  assertAdmin(req)
  const targetId = communityIdSchema.parse(req.params.userId)
  const action = z.object({ action: z.enum(['approve', 'reject', 'remove', 'promote', 'demote']) }).strict().parse(req.body).action
  const communityId = req.activeCommunity!.id
  const target = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId: targetId } } })
  if (!target) throw new HttpError(404, 'Community member not found.')
  if (action === 'approve' && target.status !== 'pending') throw new HttpError(409, 'That membership action is not available.')
  await prisma.$transaction(async (tx) => {
    if (action === 'approve') await tx.communityMember.update({ where: { id: target.id }, data: { status: 'active' } })
    else if (action === 'reject' || action === 'remove') await tx.communityMember.update({ where: { id: target.id }, data: { status: 'removed' } })
    else if (action === 'promote' || action === 'demote') await tx.communityMember.update({ where: { id: target.id }, data: { role: action === 'promote' ? 'admin' : 'member' } })
    else throw new HttpError(409, 'That membership action is not available.')
    await recordAdminAction(tx, { communityId, actorId: req.currentUser!.id, action: `member_${action}`, targetType: 'user', targetId })
  })
  res.json({ ok: true })
})
export const updateCommunityProfile: RequestHandler = asyncHandler(async (req, res) => {
  const patch = communityProfileSchema.parse(req.body)
  const community = req.activeCommunity!
  if (patch.level1 !== undefined && patch.level1 && community.level1Options.length && !community.level1Options.includes(patch.level1)) throw new HttpError(400, `Choose a valid ${community.level1Label}.`)
  const member = await prisma.communityMember.update({ where: { communityId_userId: { communityId: community.id, userId: req.currentUser!.id } }, data: { ...(patch.level1 === undefined ? {} : { level1Value: patch.level1 }), ...(patch.level2 === undefined ? {} : { level2Value: patch.level2 }) } })
  res.json({ membership: { communityId: community.id, level1Value: member.level1Value, level2Value: member.level2Value } })
})
export const leaveCommunity: RequestHandler = asyncHandler(async (req, res) => {
  const communityId = req.activeCommunity!.id, userId = req.currentUser!.id, member = req.communityMember!
  if (member.role === 'admin') {
    const admins = await prisma.communityMember.count({ where: { communityId, role: 'admin', status: 'active' } })
    if (admins <= 1) throw new HttpError(409, 'Promote another member to admin before leaving.')
  }
  const pending = await prisma.borrowRequest.count({ where: { communityId, status: 'accepted', OR: [{ ownerId: userId }, { borrowerId: userId }] } })
  if (pending) throw new HttpError(409, 'Return or close your active loans before leaving this community.')
  await prisma.communityMember.update({ where: { communityId_userId: { communityId, userId } }, data: { status: 'removed' } })
  res.json({ ok: true })
})
