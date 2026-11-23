import type { Request, Response } from 'express'

type RateLimitRequest = Request & { rateLimit?: { resetTime?: Date } }

function retryText(seconds: number) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

export function rateLimitHandler(label: string, windowMs: number) {
  return (req: Request, res: Response) => {
    const resetTime = (req as RateLimitRequest).rateLimit?.resetTime
    const retryAfterSeconds = Math.max(1, Math.ceil(((resetTime?.getTime() ?? Date.now() + windowMs) - Date.now()) / 1000))
    res.setHeader('Retry-After', String(retryAfterSeconds))
    res.status(429).json({ error: `${label} limit reached. Try again in ${retryText(retryAfterSeconds)}.`, retryAfterSeconds })
  }
}
