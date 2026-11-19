import { rateLimit } from 'express-rate-limit'

const sharedSettings = {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: (_req: import('express').Request, res: import('express').Response) => {
    res.status(429).json({ error: 'Too many invite code attempts. Try again in 15 minutes.' })
  },
}

export const inviteIpLimiter = rateLimit(sharedSettings)
export const inviteUserLimiter = rateLimit({
  ...sharedSettings,
  keyGenerator: (req) => req.currentUser?.id ?? 'unauthed',
})
