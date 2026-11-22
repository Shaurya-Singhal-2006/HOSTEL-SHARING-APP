import 'dotenv/config'
import { z } from 'zod'

const isDevelopment = (process.env.NODE_ENV ?? 'development') === 'development'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:4000'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  WANTED_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000)
    .default(isDevelopment ? 1000 : 10),
  WANTED_MAX_OPEN_POSTS: z.coerce.number().int().positive().max(10000)
    .default(isDevelopment ? 1000 : 5),
  COMMUNITY_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 3),
  COMMUNITY_JOIN_LIMIT_PER_15_MINUTES: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 5),
  ITEM_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 20),
  REQUEST_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 10),
  FEEDBACK_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 3),
  REPORT_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 5),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration:', result.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = result.data
export const isProduction = env.NODE_ENV === 'production'
