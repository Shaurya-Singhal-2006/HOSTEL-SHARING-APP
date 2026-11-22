import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'

export const itemCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.ITEM_CREATE_LIMIT_PER_HOUR,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!),
  message: { error: 'You have reached the listing limit. Try again in an hour.' },
})
