import { Router } from 'express'
import { createRating, getLeaderboard, getReputation } from '../controllers/ratings.controller.js'
import { requireAuth, requireCompleteProfile, requireCommunity } from '../middleware/auth.js'

export const ratingsRouter = Router()
ratingsRouter.use(requireAuth, requireCommunity, requireCompleteProfile)
ratingsRouter.post('/', createRating)
ratingsRouter.get('/leaderboard', getLeaderboard)
ratingsRouter.get('/users/:id/reputation', getReputation)
