import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'

const base = { windowMs: 15 * 60 * 1000, limit: env.COMMUNITY_JOIN_LIMIT_PER_15_MINUTES, standardHeaders: 'draft-8' as const, legacyHeaders: false }
export const communityJoinIpLimit = rateLimit({ ...base, message: { error: 'Too many community join attempts. Try again in 15 minutes.' } })
export const communityJoinUserLimit = rateLimit({ ...base, keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!), message: { error: 'Too many community join attempts. Try again in 15 minutes.' } })
export const communityCreateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: env.COMMUNITY_CREATE_LIMIT_PER_HOUR, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: (req) => req.currentUser?.id ?? ipKeyGenerator(req.ip!), message: { error: 'Community creation limit reached. Try again later.' } })
