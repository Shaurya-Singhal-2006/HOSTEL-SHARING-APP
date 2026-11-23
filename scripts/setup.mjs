import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const npmCli = process.env.npm_execpath
if (!npmCli) {
  console.error('Could not locate npm. Run this with `npm run setup` from the project root.')
  process.exit(1)
}

function run(args, step) {
  console.log(`\n[setup] ${step}`)
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, stdio: 'inherit', env: process.env, windowsHide: true })
  if (result.error) {
    console.error(`[setup] ${step} could not start: ${result.error.message}`)
    process.exit(result.status || 1)
  }
  if (result.status !== 0) process.exit(result.status || 1)
}

run(['install'], 'Install dependencies')
run(['run', 'db:generate'], 'Generate Prisma Client')
run(['run', 'db:migrate:deploy'], 'Apply existing migrations non-interactively')
console.log('\nSetup complete. Start the app with `npm run dev`.')
