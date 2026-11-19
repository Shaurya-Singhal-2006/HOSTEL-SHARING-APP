import { Router } from 'express'
import { listCategories } from '../controllers/items.controller.js'
import { requireAuth, requireCompleteProfile, requireJoined } from '../middleware/auth.js'

export const categoriesRouter = Router()
categoriesRouter.get('/', requireAuth, requireJoined, requireCompleteProfile, listCategories)
