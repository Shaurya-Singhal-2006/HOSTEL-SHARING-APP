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
import { requestContext } from './middleware/request-context.js'
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
import { openApiDocument } from './lib/openapi.js'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', isProduction ? 1 : false)
app.use(requestContext)
app.use(requestTimeout)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}))
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

const livenessHandler = (_req: import('express').Request, res: import('express').Response) => {
  res.json({ status: 'ok', service: 'lendloop-api' })
}

const readinessHandler = asyncHandler(async (_req, res) => {
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
})

for (const prefix of ['/api', '/api/v1']) {
  app.get(`${prefix}/health`, livenessHandler)
  app.get(`${prefix}/ready`, readinessHandler)
  if (prefix === '/api' && env.NODE_ENV === 'development') app.get('/api/docs', (_req, res) => res.json(openApiDocument))
  app.use(`${prefix}/auth`, authRouter)
  app.use(`${prefix}/me`, meRouter)
  app.use(`${prefix}/communities`, communitiesRouter)
  app.use(`${prefix}/reports`, reportsRouter)
  app.use(`${prefix}/blocks`, blocksRouter)
  app.use(`${prefix}/items`, itemsRouter)
  app.use(`${prefix}/categories`, categoriesRouter)
  app.use(`${prefix}/requests`, requestsRouter)
  app.use(`${prefix}/notifications`, notificationsRouter)
  app.use(`${prefix}/wanted`, wantedRouter)
  app.use(`${prefix}/ratings`, ratingsRouter)
  app.use(`${prefix}/feedback`, feedbackRouter)
}

app.use(notFoundHandler)
app.use(errorHandler)
