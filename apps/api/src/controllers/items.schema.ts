import { z } from 'zod'
import { ITEM_CATEGORIES, sanitizeText } from '../services/item.service.js'

const categorySchema = z.enum(ITEM_CATEGORIES)
const conditionSchema = z.enum(['New', 'Good', 'Used'])
const textSchema = (minimum: number, maximum: number) => z.string().transform(sanitizeText).pipe(z.string().min(minimum).max(maximum))

export const createItemSchema = z.object({
  title: textSchema(2, 100),
  description: textSchema(0, 2000).default(''),
  category: categorySchema,
  condition: conditionSchema.default('Good'),
  max_lend_days: z.coerce.number().int().min(1).max(365),
}).strict()
export const updateItemSchema = z.object({
  title: textSchema(2, 100).optional(),
  description: textSchema(0, 2000).optional(),
  category: categorySchema.optional(),
  condition: conditionSchema.optional(),
  max_lend_days: z.coerce.number().int().min(1).max(365).optional(),
  status: z.enum(['available', 'lent', 'hidden']).optional(),
  remove_photos: z.union([z.array(z.string()), z.string()]).optional(),
}).strict()
export const itemIdSchema = z.string().uuid()
export const itemListQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  category: categorySchema.optional(),
  level1: z.string().trim().min(1).max(40).optional(),
  floor: z.coerce.number().int().min(0).max(5).optional(),
  available: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict()
