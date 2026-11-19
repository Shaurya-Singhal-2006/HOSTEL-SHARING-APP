import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/errors.js'
import { z } from 'zod'
import {
  clearOAuthStateCookie, clearSessionCookie, OAUTH_STATE_COOKIE,
  oauthStateCookieOptions, issueSession, setSessionCookie,
} from '../lib/session.js'
import { findOrCreateGoogleUser, googleOAuthClient } from '../services/google-auth.service.js'

const googleCallbackQuerySchema = z.object({
  state: z.string().min(1).max(256),
  code: z.string().min(1).max(4096).optional(),
  error: z.string().max(128).optional(),
}).passthrough()

function sameSecret(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

export const startGoogleAuth: RequestHandler = (_req, res, next) => {
  try {
    const state = randomBytes(32).toString('base64url')
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions)
    const url = googleOAuthClient.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    })
    return res.redirect(url)
  } catch (error) {
    return next(error)
  }
}

export const googleCallback: RequestHandler = asyncHandler(async (req, res) => {
  const query = googleCallbackQuerySchema.safeParse(req.query)
  if (!query.success) throw new HttpError(400, 'Google sign-in could not be verified. Please try again.')
  const { state, code, error } = query.data
  const cookieState = typeof req.cookies?.[OAUTH_STATE_COOKIE] === 'string' ? req.cookies[OAUTH_STATE_COOKIE] : ''
  clearOAuthStateCookie(res)
  if (!cookieState || !sameSecret(state, cookieState)) {
    throw new HttpError(400, 'Google sign-in could not be verified. Please try again.')
  }
  if (error) {
    return res.redirect(`${env.WEB_ORIGIN}/login?error=google_cancelled`)
  }

  if (!code) throw new HttpError(400, 'Google did not return a sign-in code.')
  const { tokens } = await googleOAuthClient.getToken(code)
  if (!tokens.id_token) throw new HttpError(401, 'Google did not verify this account.')
  const ticket = await googleOAuthClient.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new HttpError(401, 'Use a verified Google account to sign in.')
  }

  const user = await findOrCreateGoogleUser({
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name?.trim() ?? '',
    avatarUrl: payload.picture ?? null,
  })
  setSessionCookie(res, issueSession(user.id))
  return res.redirect(`${env.WEB_ORIGIN}/auth/callback`)
})

export const logout: RequestHandler = (_req, res) => {
  clearSessionCookie(res)
  res.status(200).json({ ok: true })
}
