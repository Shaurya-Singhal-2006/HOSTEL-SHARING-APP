import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
dotenv.config({ path: resolve(root, 'apps/api/.env') })
const cli = resolve(root, 'node_modules/prisma/build/index.js')
const result = spawnSync(process.execPath, [cli, 'generate', '--schema', 'apps/api/prisma/schema.prisma'], { cwd: root, env: process.env, encoding: 'utf8', windowsHide: true })
const stdout = result.stdout ?? ''
const stderr = result.stderr ?? ''
const combined = `${stdout}\n${stderr}`
const lockedWindowsEngine = process.platform === 'win32' && /EPERM|operation not permitted/i.test(combined) && /query_engine-windows\.dll\.node|\.prisma[\\/]client/i.test(combined)

if (lockedWindowsEngine) {
  const listing = spawnSync('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true })
  const pids = (listing.stdout ?? '').split(/\r?\n/).map((line) => line.match(/^"node\.exe","(\d+)"/i)?.[1]).filter((pid) => pid && Number(pid) !== process.pid)
  console.error('Prisma Client could not replace its Windows engine because another Node process or Prisma Studio has the file open.')
  console.error(pids.length ? `Node process IDs found: ${[...new Set(pids)].join(', ')}.` : 'No other Node process was listed; the file may still be held by Prisma Studio or a child process.')
  console.error('Stop `npm run dev` and Prisma Studio, then run `npm run db:generate` again.')
  process.exit(1)
}

if (stdout) process.stdout.write(stdout)
if (stderr) process.stderr.write(stderr)
if (result.error) {
  console.error(`Prisma generate could not start: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
