import { rateLimit } from 'express-rate-limit'

export const feedbackRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUser?.id ?? 'unknown',
  message: { error: 'You’ve sent a few notes already. Please try again in an hour.' },
})
