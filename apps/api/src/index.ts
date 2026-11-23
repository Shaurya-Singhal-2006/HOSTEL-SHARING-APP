import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

async function start() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      (async () => {
        await prisma.$connect()
        await prisma.$queryRaw`SELECT 1`
      })(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Database connection timed out.')), env.DATABASE_STARTUP_TIMEOUT_MS)
        timer.unref?.()
      }),
    ])
    console.info('[api] Database connection established.')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`[api] Could not connect to the database. Check DATABASE_URL and ensure PostgreSQL is running. ${detail}`)
    process.exit(1)
  } finally {
    if (timer) clearTimeout(timer)
  }

  const server = app.listen(env.PORT, () => {
    console.info(`LendLoop API listening on ${env.API_ORIGIN}`)
  })
  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`[api] Could not start on port ${env.PORT}: ${error.message}`)
    process.exit(1)
  })

  async function shutdown() {
    server.close()
    await prisma.$disconnect()
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

void start()
