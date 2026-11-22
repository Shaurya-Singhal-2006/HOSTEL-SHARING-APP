import type { RequestHandler } from 'express'
import { HttpError } from '../lib/errors.js'
export const joinHostel: RequestHandler = (_req, _res, next) => next(new HttpError(410, 'The single hostel invite flow has been replaced. Join a community at /api/communities/join.'))
