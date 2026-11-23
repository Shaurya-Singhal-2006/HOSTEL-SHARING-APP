import { Router } from 'express'
import { blockUser, createReport, listBlocks, listReports, resolveReport, unblockUser } from '../controllers/safety.controller.js'
import { requireAuth, requireCommunity } from '../middleware/auth.js'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { rateLimitHandler } from '../middleware/rate-limit-response.js'

export const reportsRouter = Router()
reportsRouter.use(requireAuth, requireCommunity)
reportsRouter.post('/', rateLimit({ windowMs: 3600000, limit: env.REPORT_LIMIT_PER_HOUR, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!), handler: rateLimitHandler('Report', 3600000) }), createReport)
reportsRouter.get('/', listReports)
reportsRouter.patch('/:id', resolveReport)

export const blocksRouter = Router()
blocksRouter.use(requireAuth, requireCommunity)
blocksRouter.get('/', listBlocks)
blocksRouter.post('/:userId', blockUser)
blocksRouter.delete('/:userId', unblockUser)
