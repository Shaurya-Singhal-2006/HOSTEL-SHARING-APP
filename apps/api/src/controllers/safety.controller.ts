import type { RequestHandler } from 'express'
import { ReportTargetType, ReportStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { sanitizeText } from '../services/item.service.js'
import { recordAdminAction } from '../services/audit.service.js'

const idSchema = z.string().uuid()
const reportSchema = z.object({ targetType: z.nativeEnum(ReportTargetType), targetId: idSchema, reason: z.string().trim().min(3).max(100), note: z.string().max(500).optional().transform((v) => v ? sanitizeText(v) : null) }).strict()
const admin = (req: import('express').Request) => { if (req.communityMember?.role !== 'admin') throw new HttpError(403, 'Community admin access required.') }

export const createReport: RequestHandler = asyncHandler(async (req, res) => {
  const input = reportSchema.parse(req.body)
  const communityId = req.activeCommunity!.id
  if (input.targetType === 'item') {
    const found = await prisma.item.findFirst({ where: { id: input.targetId, communityId }, select: { id: true } })
    if (!found) throw new HttpError(404, 'Report target not found.')
  } else {
    const found = await prisma.communityMember.findFirst({ where: { communityId, userId: input.targetId, status: 'active' }, select: { id: true } })
    if (!found || input.targetId === req.currentUser!.id) throw new HttpError(404, 'Report target not found.')
  }
  const report = await prisma.report.create({ data: { communityId, reporterId: req.currentUser!.id, ...input } })
  res.status(201).json({ report: { id: report.id, targetType: report.targetType, targetId: report.targetId, reason: report.reason, status: report.status, createdAt: report.createdAt } })
})
export const listReports: RequestHandler = asyncHandler(async (req, res) => {
  admin(req)
  const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict().parse(req.query)
  const where = { communityId: req.activeCommunity!.id }
  const [reports, total] = await Promise.all([
    prisma.report.findMany({ where, include: { reporter: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.report.count({ where }),
  ])
  res.json({ reports, pagination: { page: query.page, pageSize: query.limit, total, hasMore: query.page * query.limit < total } })
})
export const resolveReport: RequestHandler = asyncHandler(async (req, res) => {
  admin(req)
  const id = idSchema.parse(req.params.id)
  const input = z.object({ action: z.enum(['dismiss', 'hide_item', 'remove_member']) }).strict().parse(req.body)
  const report = await prisma.report.findFirst({ where: { id, communityId: req.activeCommunity!.id, status: 'open' } })
  if (!report) throw new HttpError(404, 'Open report not found.')
  await prisma.$transaction(async (tx) => {
    if (input.action === 'hide_item') {
      if (report.targetType !== 'item') throw new HttpError(400, 'This report is not about an item.')
      await tx.item.updateMany({ where: { id: report.targetId, communityId: report.communityId }, data: { status: 'hidden' } })
    }
    if (input.action === 'remove_member') {
      if (report.targetType !== 'user') throw new HttpError(400, 'This report is not about a member.')
      const target = await tx.communityMember.findUnique({ where: { communityId_userId: { communityId: report.communityId, userId: report.targetId } } })
      if (!target) throw new HttpError(404, 'Reported member not found.')
      if (target.role === 'admin' && await tx.communityMember.count({ where: { communityId: report.communityId, role: 'admin', status: 'active' } }) <= 1) throw new HttpError(409, 'Promote another admin before removing the only admin.')
      await tx.communityMember.update({ where: { id: target.id }, data: { status: 'removed' } })
    }
    await tx.report.update({ where: { id }, data: { status: input.action === 'dismiss' ? 'dismissed' : 'actioned' } })
    await recordAdminAction(tx, { communityId: report.communityId, actorId: req.currentUser!.id, action: `report_${input.action}`, targetType: report.targetType, targetId: report.targetId, metadata: { reportId: report.id } })
  })
  res.json({ ok: true })
})
export const blockUser: RequestHandler = asyncHandler(async (req, res) => {
  const blockedId = idSchema.parse(req.params.userId)
  if (blockedId === req.currentUser!.id) throw new HttpError(400, 'You cannot block yourself.')
  const communityId = req.activeCommunity!.id
  const exists = await prisma.communityMember.count({ where: { communityId, userId: blockedId, status: 'active' } })
  if (!exists) throw new HttpError(404, 'Community member not found.')
  await prisma.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: req.currentUser!.id, blockedId } }, create: { blockerId: req.currentUser!.id, blockedId }, update: {} })
  res.status(204).end()
})
export const unblockUser: RequestHandler = asyncHandler(async (req, res) => {
  const blockedId = idSchema.parse(req.params.userId)
  await prisma.userBlock.deleteMany({ where: { blockerId: req.currentUser!.id, blockedId } })
  res.status(204).end()
})
export const listBlocks: RequestHandler = asyncHandler(async (req, res) => {
  const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict().parse(req.query)
  const where = { blockerId: req.currentUser!.id }
  const [blocks, total] = await Promise.all([
    prisma.userBlock.findMany({ where, include: { blocked: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.userBlock.count({ where }),
  ])
  res.json({ blocks: blocks.map((b) => ({ user: b.blocked, createdAt: b.createdAt })), pagination: { page: query.page, pageSize: query.limit, total, hasMore: query.page * query.limit < total } })
})
