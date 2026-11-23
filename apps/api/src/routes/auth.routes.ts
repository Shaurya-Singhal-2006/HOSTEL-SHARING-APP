import { Router } from 'express'
import { googleCallback, logout, startGoogleAuth } from '../controllers/auth.controller.js'
import { listDemoUsers, loginAsDemoUser } from '../controllers/demo-auth.controller.js'
import { isProduction } from '../config/env.js'

export const authRouter = Router()
authRouter.get('/google', startGoogleAuth)
authRouter.get('/google/callback', googleCallback)
authRouter.post('/logout', logout)
if (process.env.DEMO_MODE === 'true' && !isProduction) {
  authRouter.get('/demo/users', listDemoUsers)
  authRouter.post('/demo', loginAsDemoUser)
}
