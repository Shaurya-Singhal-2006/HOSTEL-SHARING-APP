import { Router } from 'express'
import { createRating, getReputation } from '../controllers/ratings.controller.js'
import { requireAuth, requireCompleteProfile, requireJoined } from '../middleware/auth.js'

export const ratingsRouter = Router()
ratingsRouter.post('/', requireAuth, requireJoined, requireCompleteProfile, createRating)
ratingsRouter.get('/users/:id/reputation', getReputation)
