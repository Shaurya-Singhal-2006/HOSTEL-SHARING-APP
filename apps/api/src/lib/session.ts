import jwt from 'jsonwebtoken'
import type { CookieOptions, Response } from 'express'
import { env, isProduction } from '../config/env.js'

export const SESSION_COOKIE = 'lendloop_session'
export const OAUTH_STATE_COOKIE = 'lendloop_oauth_state'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_MS,
}

export const oauthStateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 10 * 60 * 1000,
}

export function issueSession(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    algorithm: 'HS256', subject: userId, issuer: 'lendloop-api', audience: 'lendloop-web', expiresIn: '7d',
  })
}

export function readSession(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: 'lendloop-api', audience: 'lendloop-web',
    })
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions)
}

export function clearSessionCookie(res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = sessionCookieOptions
  res.clearCookie(SESSION_COOKIE, clearOptions)
}

export function clearOAuthStateCookie(res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = oauthStateCookieOptions
  res.clearCookie(OAUTH_STATE_COOKIE, clearOptions)
}
