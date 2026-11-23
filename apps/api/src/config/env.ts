import 'dotenv/config'
import { z } from 'zod'

const isDevelopment = (process.env.NODE_ENV ?? 'development') === 'development'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a PostgreSQL connection URL.').refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), 'DATABASE_URL must use the postgres:// or postgresql:// protocol.'),
  WEB_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173').refine((value) => value.split(',').every((entry) => {
    const origin = entry.trim()
    try { const parsed = new URL(origin); return parsed.origin === origin } catch { return false }
  }), 'WEB_ORIGIN must be a comma-separated list of origins, such as http://localhost:5173,http://127.0.0.1:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:4000'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default(isDevelopment ? 'debug' : 'info'),
  DEMO_MODE: z.enum(['true', 'false']).default('false'),
  DEMO_SOURCE_DATABASE_URL: z.string().url().optional(),
  API_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(15000),
  API_HEALTH_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(2500),
  DATABASE_STARTUP_TIMEOUT_MS: z.coerce.number().int().positive().max(60000).default(10000),
  WANTED_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000)
    .default(isDevelopment ? 1000 : 10),
  WANTED_MAX_OPEN_POSTS: z.coerce.number().int().positive().max(10000)
    .default(isDevelopment ? 1000 : 5),
  COMMUNITY_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 3),
  COMMUNITY_MAX_ADMIN_COMMUNITIES: z.coerce.number().int().positive().max(10000).default(isDevelopment ? 1000 : 3),
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
if (env.DEMO_MODE === 'true') {
  if (isProduction) {
    console.error('DEMO_MODE is available only outside production.')
    process.exit(1)
  }
  const dbName = (rawUrl: string) => decodeURIComponent(new URL(rawUrl).pathname.replace(/^\/+/, '').split('/').at(-1) ?? '')
  try {
    const activeDatabase = dbName(env.DATABASE_URL)
    if (!activeDatabase.endsWith('_demo')) {
      console.error('DEMO_MODE requires DATABASE_URL to target a database ending in _demo.')
      process.exit(1)
    }
    const sourceUrl = env.DEMO_SOURCE_DATABASE_URL
    if (sourceUrl && dbName(sourceUrl) === activeDatabase) {
      console.error('DEMO_MODE database must differ from DEMO_SOURCE_DATABASE_URL.')
      process.exit(1)
    }
  } catch {
    console.error('DEMO_MODE could not validate its database URL. Check DATABASE_URL and DEMO_SOURCE_DATABASE_URL.')
    process.exit(1)
  }
}
export const webOrigins = env.WEB_ORIGIN.split(',').map((origin) => origin.trim())
export const webOrigin = webOrigins[0] ?? 'http://localhost:5173'
