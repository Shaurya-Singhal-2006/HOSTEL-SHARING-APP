import { Router } from 'express'
import { joinHostel } from '../controllers/join.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { inviteIpLimiter, inviteUserLimiter } from '../middleware/invite-rate-limit.js'

export const joinRouter = Router()
joinRouter.post('/', inviteIpLimiter, requireAuth, inviteUserLimiter, joinHostel)
