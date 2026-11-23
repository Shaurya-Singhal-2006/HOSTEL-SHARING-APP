import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
dotenv.config({ path: resolve(root, 'apps/api/.env') })

function databaseName(rawUrl) {
  const url = new URL(rawUrl)
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, '').split('/').at(-1) ?? '')
  if (!name) throw new Error('DATABASE_URL must contain a database name.')
  return name
}

try {
  if (process.env.NODE_ENV === 'production') throw new Error('dev:demo cannot run when NODE_ENV=production.')
  const sourceUrl = process.env.DATABASE_URL
  if (!sourceUrl) throw new Error('DATABASE_URL is required so dev:demo can prove it is using a separate database.')
  const sourceDatabase = databaseName(sourceUrl)
  const demoUrl = process.env.DEMO_DATABASE_URL ? new URL(process.env.DEMO_DATABASE_URL) : new URL(sourceUrl)
  if (!process.env.DEMO_DATABASE_URL) demoUrl.pathname = '/lendloop_demo'
  const demoDatabase = databaseName(demoUrl.toString())
  if (!demoDatabase.endsWith('_demo')) throw new Error(`Refusing demo mode: database "${demoDatabase}" must end in _demo.`)
  if (demoDatabase === sourceDatabase) throw new Error(`Refusing demo mode: "${demoDatabase}" is the DATABASE_URL database.`)

  console.log('======================================')
  console.log('DEMO DATABASE: not real data')
  console.log(`Using "${demoDatabase}"; DATABASE_URL database "${sourceDatabase}" is not used.`)
  console.log('Web: http://localhost:5173  |  API: http://localhost:4000')
  console.log('======================================')

  const apiEnv = {
    ...process.env,
    NODE_ENV: 'development',
    DATABASE_URL: demoUrl.toString(),
    DEMO_DATABASE_URL: demoUrl.toString(),
    DEMO_SOURCE_DATABASE_URL: sourceUrl,
    DEMO_MODE: 'true',
    PORT: '4000',
    API_ORIGIN: 'http://localhost:4000',
    API_PUBLIC_URL: 'http://localhost:4000',
    WEB_ORIGIN: 'http://localhost:5173,http://127.0.0.1:5173',
  }
  const webEnv = {
    ...process.env,
    VITE_API_URL: 'http://localhost:4000',
    VITE_DEMO_MODE: 'true',
  }
  const processes = [
    spawn(process.execPath, [resolve(root, 'node_modules/tsx/dist/cli.mjs'), 'watch', 'src/index.ts'], { cwd: resolve(root, 'apps/api'), env: apiEnv, stdio: 'inherit' }),
    spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--configLoader', 'runner', '--host', '0.0.0.0'], { cwd: resolve(root, 'apps/web'), env: webEnv, stdio: 'inherit' }),
  ]
  let stopping = false
  const stopAll = (except) => {
    if (stopping) return
    stopping = true
    for (const child of processes) if (child !== except && child.exitCode === null) child.kill()
  }
  for (const child of processes) {
    child.on('error', (error) => { console.error(`[dev:demo] Could not start a process: ${error.message}`); process.exitCode = 1; stopAll(child) })
    child.on('exit', (code) => {
      if (!stopping) {
        if (code !== 0) process.exitCode = code ?? 1
        stopAll(child)
      }
    })
  }
  process.on('SIGINT', () => { process.exitCode = 130; stopAll() })
  process.on('SIGTERM', () => { process.exitCode = 143; stopAll() })
} catch (error) {
  console.error(`[dev:demo] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
