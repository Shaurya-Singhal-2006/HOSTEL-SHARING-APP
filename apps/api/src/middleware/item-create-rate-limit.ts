import { rateLimit } from 'express-rate-limit'

export const itemCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUser?.id ?? req.ip ?? 'unknown',
  message: { error: 'You have reached the listing limit. Try again in an hour.' },
})
