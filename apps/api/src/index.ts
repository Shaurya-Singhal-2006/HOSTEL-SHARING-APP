import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { z } from 'zod'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const allowedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'

app.disable('x-powered-by')
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'lendloop-api' })
})

app.post('/api/phase-one/validate', (req, res) => {
  const payload = z.object({ value: z.string().trim().min(1).max(120) }).safeParse(req.body)
  if (!payload.success) return res.status(400).json({ error: 'Invalid request', details: payload.error.flatten() })
  return res.json({ valid: true })
})

app.listen(port, () => {
  console.log(`LendLoop API listening on http://localhost:${port}`)
})
