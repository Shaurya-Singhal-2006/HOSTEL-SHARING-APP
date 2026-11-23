import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { logger } from './lib/logger.js'

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
    logger.info({ event: 'database_connected' }, 'Database connection established')
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    logger.error({ event: 'database_connection_failed', errorName }, 'Postgres is not running or the DATABASE_URL is wrong')
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  } finally {
    if (timer) clearTimeout(timer)
  }

  const server = app.listen(env.PORT, () => {
    logger.info({ event: 'server_listening', port: env.PORT }, 'LendLoop API listening')
  })
  server.on('error', (error: NodeJS.ErrnoException) => {
    logger.error({ event: 'server_start_failed', port: env.PORT, errorCode: error.code }, 'Could not start API server')
    process.exit(1)
  })

  let shuttingDown = false
  async function shutdown() {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ event: 'shutdown_started' }, 'Shutting down API')
    const forceExit = setTimeout(() => process.exit(1), 10_000)
    forceExit.unref()
    server.close(async () => {
      await prisma.$disconnect()
      clearTimeout(forceExit)
      process.exit(0)
    })
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

void start()
