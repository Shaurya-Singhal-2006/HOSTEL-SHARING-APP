import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'

export const wantedCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.WANTED_CREATE_LIMIT_PER_HOUR,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!),
  message: { error: 'You have reached the wanted post limit. Try again in an hour.' },
})
