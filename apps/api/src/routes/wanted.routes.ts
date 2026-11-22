import { Router } from 'express'
import { closeWanted, createWanted, deleteWanted, fulfillWanted, getWanted, listWanted, respondWanted } from '../controllers/wanted.controller.js'
import { requireAuth, requireCompleteProfile, requireCommunity } from '../middleware/auth.js'
import { wantedCreateRateLimit } from '../middleware/wanted-create-rate-limit.js'

export const wantedRouter = Router()
wantedRouter.use(requireAuth, requireCommunity, requireCompleteProfile)
wantedRouter.get('/', listWanted)
wantedRouter.post('/', wantedCreateRateLimit, createWanted)
wantedRouter.get('/:id', getWanted)
wantedRouter.post('/:id/respond', respondWanted)
wantedRouter.patch('/:id/fulfill', fulfillWanted)
wantedRouter.patch('/:id/close', closeWanted)
wantedRouter.delete('/:id', deleteWanted)
