import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { webOrigin } from '../config/env.js'
import { AppError, errorResponse } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { clearOAuthStateCookie } from '../lib/session.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(errorResponse('ROUTE_NOT_FOUND', 'Route not found.'))
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (res.headersSent || res.writableEnded) return
  if (req.path.endsWith('/auth/google/callback')) {
    clearOAuthStateCookie(res)
    return res.redirect(`${webOrigin}/login?error=google_auth_failed`)
  }

  if (error instanceof ZodError) {
    const details = error.flatten().fieldErrors
    const first = Object.values(details).flat()[0]
    return res.status(400).json(errorResponse('VALIDATION_ERROR', first ?? 'Please check the information and try again.', details))
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(errorResponse(error.code, error.message, error.details))
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json(errorResponse('ALREADY_EXISTS', 'That record already exists.'))
    if (error.code === 'P2025') return res.status(404).json(errorResponse('NOT_FOUND', 'The requested record was not found.'))
    if (error.code === 'P2003') return res.status(409).json(errorResponse('RELATED_RECORD_EXISTS', 'This change conflicts with related records.'))
    if (error.code === 'P2021' || error.code === 'P2022') return res.status(503).json(errorResponse('DATABASE_SCHEMA_OUT_OF_DATE', 'The database needs its latest migrations. Apply them and try again.'))
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json(errorResponse('DATABASE_UNAVAILABLE', 'The database is unavailable. Please try again shortly.'))
  }
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'MulterError') {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : 'UPLOAD_REJECTED'
    const status = code === 'LIMIT_FILE_SIZE' ? 413 : 400
    const message = code === 'LIMIT_FILE_SIZE' ? 'That photo is too large. Choose a smaller file.' : 'The photo could not be uploaded. Check the file and try again.'
    return res.status(status).json(errorResponse(code, message))
  }

  const errorName = error instanceof Error ? error.name : 'UnknownError'
  logger.error({ requestId: req.requestId, errorName, errorCode: 'INTERNAL_ERROR' }, 'Unhandled API exception')
  return res.status(500).json(errorResponse('INTERNAL_ERROR', 'We couldn’t complete that request. Please try again.'))
}
