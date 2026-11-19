import type { RequestHandler } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/async-handler.js'
import { prisma } from '../lib/prisma.js'
import { sanitizeText } from '../services/item.service.js'

const feedbackSchema = z.object({
  message: z.string().max(2000).transform(sanitizeText).pipe(z.string().min(10).max(1000)),
}).strict()

export const submitFeedback: RequestHandler = asyncHandler(async (req, res) => {
  const input = feedbackSchema.parse(req.body)
  await prisma.feedback.create({ data: { userId: req.currentUser!.id, message: input.message } })
  res.status(201).json({ ok: true })
})
