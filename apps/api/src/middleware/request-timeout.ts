import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { errorResponse } from '../lib/errors.js'

export const requestTimeout: RequestHandler = (_req, res, next) => {
  const timer = setTimeout(() => {
    if (res.headersSent || res.writableEnded) return
    res.status(504).json(errorResponse('REQUEST_TIMEOUT', 'The API request timed out. Please try again.'))
  }, env.API_REQUEST_TIMEOUT_MS)
  timer.unref?.()
  res.once('finish', () => clearTimeout(timer))
  res.once('close', () => clearTimeout(timer))
  next()
}
