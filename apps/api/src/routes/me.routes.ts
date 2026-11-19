import { Router } from 'express'
import { getMe, patchMe } from '../controllers/me.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const meRouter = Router()
meRouter.get('/', requireAuth, getMe)
meRouter.patch('/', requireAuth, patchMe)
