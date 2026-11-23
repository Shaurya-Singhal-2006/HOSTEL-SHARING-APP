import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { logger } from '../lib/logger.js'

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const requestContext: RequestHandler = (req, res, next) => {
  const suppliedId = req.get('X-Request-Id')?.trim()
  const requestId = suppliedId && requestIdPattern.test(suppliedId) ? suppliedId : randomUUID()
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  const start = process.hrtime.bigint()

  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
    const context = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ...(req.currentUser?.id ? { userId: req.currentUser.id } : {}),
      ...(req.activeCommunity?.id ? { communityId: req.activeCommunity.id } : {}),
    }
    if (res.statusCode >= 500) logger.error(context, 'API request failed')
    else if (res.statusCode >= 400) logger.warn(context, 'API request rejected')
    else logger.info(context, 'API request completed')
  })
  next()
}
