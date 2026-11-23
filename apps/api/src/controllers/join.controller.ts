import type { RequestHandler } from 'express'
import { HttpError } from '../lib/errors.js'
export const retiredInviteFlow: RequestHandler = (_req, _res, next) => next(new HttpError(410, 'This invite flow is no longer available. Join a community at /api/communities/join.'))
