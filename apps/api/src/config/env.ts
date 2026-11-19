import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:4000'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  HOSTEL_INVITE_CODE: z.string().min(6, 'HOSTEL_INVITE_CODE must have at least 6 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration:', result.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = result.data
export const isProduction = env.NODE_ENV === 'production'
