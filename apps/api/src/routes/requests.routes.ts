import { Router } from 'express'
import { acceptRequest, cancelRequest, createRequest, declineRequest, getRequest, listRequests, returnRequest } from '../controllers/requests.controller.js'
import { requireAuth, requireCompleteProfile, requireJoined } from '../middleware/auth.js'
import { requestCreateRateLimit } from '../middleware/request-rate-limit.js'

export const requestsRouter = Router()
requestsRouter.use(requireAuth, requireJoined, requireCompleteProfile)
requestsRouter.post('/', requestCreateRateLimit, createRequest)
requestsRouter.get('/mine', listRequests)
requestsRouter.patch('/:id/accept', acceptRequest)
requestsRouter.patch('/:id/decline', declineRequest)
requestsRouter.patch('/:id/cancel', cancelRequest)
requestsRouter.patch('/:id/return', returnRequest)
requestsRouter.get('/:id', getRequest)
