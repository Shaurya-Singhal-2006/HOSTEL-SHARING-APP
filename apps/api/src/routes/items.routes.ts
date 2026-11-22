import { Router } from 'express'
import { createItem, deleteItem, getItem, getMyItems, getPopularItems, listItems, updateItem } from '../controllers/items.controller.js'
import { requireAuth, requireCompleteProfile, requireCommunity } from '../middleware/auth.js'
import { itemCreateRateLimit } from '../middleware/item-create-rate-limit.js'
import { parseItemPhotos } from '../middleware/item-photos.js'

export const itemsRouter = Router()
itemsRouter.use(requireAuth, requireCommunity, requireCompleteProfile)
itemsRouter.get('/mine', getMyItems)
itemsRouter.get('/popular', getPopularItems)
itemsRouter.get('/', listItems)
itemsRouter.post('/', itemCreateRateLimit, parseItemPhotos, createItem)
itemsRouter.get('/:id', getItem)
itemsRouter.patch('/:id', parseItemPhotos, updateItem)
itemsRouter.delete('/:id', deleteItem)
