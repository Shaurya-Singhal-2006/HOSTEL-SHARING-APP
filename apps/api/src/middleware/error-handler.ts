import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { HttpError } from '../lib/errors.js'
import { clearOAuthStateCookie } from '../lib/session.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Route not found.' })
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (req.path === '/api/auth/google/callback') {
    clearOAuthStateCookie(res)
    return res.redirect(`${env.WEB_ORIGIN}/login?error=google_auth_failed`)
  }
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Please check the submitted fields.', details: error.flatten().fieldErrors })
  }
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return res.status(409).json({ error: 'That account is already linked.' })
  }

  console.error('Unhandled API error:', error)
  return res.status(500).json({ error: 'Something went wrong. Please try again.' })
}
