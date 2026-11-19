import { Router } from 'express'
import { submitFeedback } from '../controllers/feedback.controller.js'
import { requireAuth, requireCompleteProfile, requireJoined } from '../middleware/auth.js'
import { feedbackRateLimit } from '../middleware/feedback-rate-limit.js'

export const feedbackRouter = Router()
feedbackRouter.use(requireAuth, requireJoined, requireCompleteProfile)
feedbackRouter.post('/', feedbackRateLimit, submitFeedback)
