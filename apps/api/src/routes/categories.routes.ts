import { Router } from 'express'
import { listCategories } from '../controllers/items.controller.js'
import { requireAuth, requireCompleteProfile, requireCommunity } from '../middleware/auth.js'

export const categoriesRouter = Router()
categoriesRouter.get('/', requireAuth, requireCommunity, requireCompleteProfile, listCategories)
