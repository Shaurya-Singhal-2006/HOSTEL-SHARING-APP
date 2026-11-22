import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'

export const feedbackRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.FEEDBACK_LIMIT_PER_HOUR,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!),
  message: { error: 'You’ve sent a few notes already. Please try again in an hour.' },
})
