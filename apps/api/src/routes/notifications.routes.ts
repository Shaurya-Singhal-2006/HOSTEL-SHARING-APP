import { Router } from 'express'
import { listNotifications, readAllNotifications } from '../controllers/requests.controller.js'
import { requireAuth, requireCompleteProfile, requireCommunity } from '../middleware/auth.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth, requireCommunity, requireCompleteProfile)
notificationsRouter.get('/', listNotifications)
notificationsRouter.patch('/read-all', readAllNotifications)
