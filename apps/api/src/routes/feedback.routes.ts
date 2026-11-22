import { Router } from 'express'
import { submitFeedback } from '../controllers/feedback.controller.js'
import { requireAuth, requireCompleteProfile, requireCommunity } from '../middleware/auth.js'
import { feedbackRateLimit } from '../middleware/feedback-rate-limit.js'

export const feedbackRouter = Router()
feedbackRouter.use(requireAuth, requireCommunity, requireCompleteProfile)
feedbackRouter.post('/', feedbackRateLimit, submitFeedback)
