import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

const server = app.listen(env.PORT, () => {
  console.log(`LendLoop API listening on ${env.API_ORIGIN}`)
})

async function shutdown() {
  server.close()
  await prisma.$disconnect()
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
