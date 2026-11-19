import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env, isProduction } from './config/env.js'
import { HttpError } from './lib/errors.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { authRouter } from './routes/auth.routes.js'
import { joinRouter } from './routes/join.routes.js'
import { meRouter } from './routes/me.routes.js'
import { itemsRouter } from './routes/items.routes.js'
import { categoriesRouter } from './routes/categories.routes.js'
import { uploadsStatic } from './services/storage.service.js'
import { requestsRouter } from './routes/requests.routes.js'
import { notificationsRouter } from './routes/notifications.routes.js'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', isProduction ? 1 : false)
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === env.WEB_ORIGIN) return callback(null, true)
    return callback(new HttpError(403, 'Origin not allowed.'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/uploads', uploadsStatic)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'lendloop-api' })
})
app.use('/api/auth', authRouter)
app.use('/api/me', meRouter)
app.use('/api/join', joinRouter)
app.use('/api/items', itemsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/notifications', notificationsRouter)

app.use(notFoundHandler)
app.use(errorHandler)
