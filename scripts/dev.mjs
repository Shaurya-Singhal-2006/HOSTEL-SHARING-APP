import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const apiEnvPath = resolve(root, 'apps/api/.env')
if (!existsSync(apiEnvPath)) {
  console.error('Missing apps/api/.env. Copy .env.example there and set DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and WEB_ORIGIN.')
  process.exit(1)
}

const loaded = dotenv.config({ path: apiEnvPath, override: true })
if (loaded.error) {
  console.error(`Could not load apps/api/.env: ${loaded.error.message}`)
  process.exit(1)
}
const requiredFromApiEnv = ['DATABASE_URL', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'WEB_ORIGIN']
const absent = requiredFromApiEnv.filter((key) => !loaded.parsed?.[key]?.trim())
if (absent.length) {
  console.error(`apps/api/.env is missing required setting${absent.length === 1 ? '' : 's'}: ${absent.join(', ')}.`)
  process.exit(1)
}
try {
  const databaseName = decodeURIComponent(new URL(loaded.parsed.DATABASE_URL).pathname.replace(/^\/+/, '').split('/').at(-1) ?? '')
  if (databaseName !== 'lendloop') throw new Error('Expected the normal "lendloop" database.')
} catch (error) {
  console.error(`apps/api/.env DATABASE_URL is invalid: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

// Normal development must always use the API .env database, never test/demo overrides.
for (const name of ['TEST_DATABASE_URL', 'SMOKE_DATABASE_URL', 'DEMO_DATABASE_URL', 'DEMO_SOURCE_DATABASE_URL', 'VITE_DEMO_MODE']) delete process.env[name]
process.env.NODE_ENV = 'development'
process.env.DEMO_MODE = 'false'
process.env.PORT = '4000'
process.env.API_ORIGIN ||= 'http://localhost:4000'
process.env.API_PUBLIC_URL ||= 'http://localhost:4000'
process.env.WEB_ORIGIN ||= 'http://localhost:5173,http://127.0.0.1:5173'
process.env.VITE_API_URL = 'http://localhost:4000'
process.env.VITE_DEMO_MODE = 'false'

function startNode(label, args, cwd, onLine = () => {}) {
  const child = spawn(process.execPath, args, { cwd, env: process.env, stdio: ['inherit', 'pipe', 'pipe'], windowsHide: true })
  let pending = ''
  const write = (chunk, stream) => {
    pending += chunk.toString()
    const lines = pending.split(/\r?\n/)
    pending = lines.pop() ?? ''
    for (const line of lines) {
      if (line) process[stream].write(`[${label}] ${line}\n`)
      onLine(line)
    }
  }
  child.stdout.on('data', (chunk) => write(chunk, 'stdout'))
  child.stderr.on('data', (chunk) => write(chunk, 'stderr'))
  child.on('error', (error) => console.error(`[${label}] Could not start: ${error.message}`))
  return child
}

let dbConnected = false
let apiListening = false
const api = startNode('api', [resolve(root, 'node_modules/tsx/dist/cli.mjs'), 'watch', 'src/index.ts'], resolve(root, 'apps/api'), (line) => {
  if (line.includes('Database connection established')) { dbConnected = true; console.log('✓ Database connected using apps/api/.env') }
  if (line.includes('LendLoop API listening')) { apiListening = true; console.log('✓ API listening on http://localhost:4000') }
})
let web
let stopping = false

function stop(child) {
  if (!child || child.exitCode !== null || child.killed) return
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else child.kill('SIGTERM')
}

function stopAll() {
  if (stopping) return
  stopping = true
  stop(api)
  stop(web)
}

process.on('SIGINT', () => { process.exitCode = 130; stopAll() })
process.on('SIGTERM', () => { process.exitCode = 143; stopAll() })

web = startNode('web', [resolve(root, 'node_modules/vite/bin/vite.js'), '--configLoader', 'runner', '--host', '0.0.0.0'], resolve(root, 'apps/web'), (line) => {
  const match = line.match(/Local:\s+(https?:\/\/\S+)/)
  if (match) console.log(`✓ Web ready at ${match[1]}`)
})

await new Promise((resolveDone) => {
  api.once('exit', (code) => {
    if (!stopping) {
      if (!dbConnected || !apiListening) console.error('Postgres is not running or the DATABASE_URL is wrong. Check apps/api/.env.')
      process.exitCode = code ?? 1
    }
    resolveDone()
  })
  web.once('exit', (code) => {
    if (!stopping) { process.exitCode = code ?? 1; stopAll() }
    resolveDone()
  })
})
