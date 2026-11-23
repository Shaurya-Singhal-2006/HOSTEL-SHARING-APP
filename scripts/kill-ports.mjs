import { execFileSync, spawnSync } from 'node:child_process'

const ports = new Set([4000, 5173, 5174])
if (process.platform !== 'win32') {
  console.error('`npm run kill-ports` currently supports Windows only.')
  process.exit(1)
}

let listing
try {
  listing = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true })
} catch (error) {
  console.error(`Could not inspect listening ports: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

const pids = new Set()
for (const line of listing.split(/\r?\n/)) {
  const match = line.trim().match(/^TCP\s+(?:\[[^\]]+\]|[^\s:]+):(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i)
  if (match && ports.has(Number(match[1]))) pids.add(Number(match[2]))
}

if (!pids.size) {
  console.log('No processes are listening on ports 4000, 5173, or 5174.')
  process.exit(0)
}

for (const pid of pids) {
  const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { encoding: 'utf8', windowsHide: true })
  if (result.status === 0) console.log(`Stopped process ${pid} using port 4000, 5173, or 5174.`)
  else if (/not found|no running instance|could not be found/i.test(`${result.stdout ?? ''}${result.stderr ?? ''}`)) console.log(`Process ${pid} had already exited.`)
  else console.error(`Could not stop process ${pid}. Close it manually or run this terminal as an administrator.`)
}
