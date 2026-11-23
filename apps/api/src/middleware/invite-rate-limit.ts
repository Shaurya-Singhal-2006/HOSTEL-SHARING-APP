import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { rateLimitHandler } from './rate-limit-response.js'

const sharedSettings = {
  windowMs: 15 * 60 * 1000,
  limit: env.COMMUNITY_JOIN_LIMIT_PER_15_MINUTES,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: rateLimitHandler('Community join', 15 * 60 * 1000),
}

export const inviteIpLimiter = rateLimit(sharedSettings)
export const inviteUserLimiter = rateLimit({
  ...sharedSettings,
  keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!),
})
