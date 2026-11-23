import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env, isProduction, webOrigins } from './config/env.js'
import { HttpError } from './lib/errors.js'
import { prisma } from './lib/prisma.js'
import { asyncHandler } from './lib/async-handler.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { requestTimeout } from './middleware/request-timeout.js'
import { authRouter } from './routes/auth.routes.js'
import { meRouter } from './routes/me.routes.js'
import { itemsRouter } from './routes/items.routes.js'
import { categoriesRouter } from './routes/categories.routes.js'
import { requireItemPhotoMembership, uploadsStatic } from './services/storage.service.js'
import { requireAuth, requireCommunity } from './middleware/auth.js'
import { requestsRouter } from './routes/requests.routes.js'
import { notificationsRouter } from './routes/notifications.routes.js'
import { wantedRouter } from './routes/wanted.routes.js'
import { ratingsRouter } from './routes/ratings.routes.js'
import { feedbackRouter } from './routes/feedback.routes.js'
import { communitiesRouter } from './routes/communities.routes.js'
import { blocksRouter, reportsRouter } from './routes/safety.routes.js'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', isProduction ? 1 : false)
app.use(requestTimeout)
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || webOrigins.includes(origin)) return callback(null, true)
    return callback(new HttpError(403, 'Origin not allowed.'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/uploads', requireAuth, requireCommunity, requireItemPhotoMembership, uploadsStatic)

app.get('/api/health', asyncHandler(async (_req, res) => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new HttpError(504, 'Database health check timed out. Please try again.')), env.API_HEALTH_TIMEOUT_MS)
        timeout.unref?.()
      }),
    ])
    return res.json({ status: 'ok', service: 'lendloop-api', database: 'ok' })
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(503, 'Database connection unavailable.')
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}))
app.use('/api/auth', authRouter)
app.use('/api/me', meRouter)
app.use('/api/communities', communitiesRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/blocks', blocksRouter)
app.use('/api/items', itemsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/wanted', wantedRouter)
app.use('/api/ratings', ratingsRouter)
app.use('/api/feedback', feedbackRouter)

app.use(notFoundHandler)
app.use(errorHandler)
