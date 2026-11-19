import { Router } from 'express'
import { googleCallback, logout, startGoogleAuth } from '../controllers/auth.controller.js'

export const authRouter = Router()
authRouter.get('/google', startGoogleAuth)
authRouter.get('/google/callback', googleCallback)
authRouter.post('/logout', logout)
