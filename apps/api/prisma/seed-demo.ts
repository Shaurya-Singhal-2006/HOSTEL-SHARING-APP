import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo seeding is disabled in production.')
}

const sourceUrl = process.env.DATABASE_URL
if (!sourceUrl) throw new Error('DATABASE_URL is required so the demo seed can verify that it will not use the real database.')

function databaseName(url: string): string {
  const parsed = new URL(url)
  const name = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/').at(-1) ?? '')
  if (!name) throw new Error('Database URL must include a database name.')
  return name
}

const sourceDatabase = databaseName(sourceUrl)
const demoUrl = process.env.DEMO_DATABASE_URL
  ? new URL(process.env.DEMO_DATABASE_URL)
  : new URL(sourceUrl)
if (!process.env.DEMO_DATABASE_URL) demoUrl.pathname = '/lendloop_demo'
const targetUrl = demoUrl.toString()
const targetDatabase = databaseName(targetUrl)
if (!targetDatabase.endsWith('_demo')) throw new Error(`Refusing to run: demo database name "${targetDatabase}" must end in _demo.`)
if (targetDatabase === sourceDatabase) throw new Error(`Refusing to run: demo database "${targetDatabase}" is the same database as DATABASE_URL. The real database is never used by this seed.`)

const reset = process.argv.slice(2).includes('--reset')
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== '--reset')
if (unknownArguments.length) throw new Error(`Unknown demo seed option: ${unknownArguments.join(', ')}. Use --reset to recreate only the demo database.`)
console.info(`Demo target database: ${targetDatabase} (source database: ${sourceDatabase})`)
if (reset) console.info(`Reset requested: only "${targetDatabase}" will be dropped and recreated.`)

const prismaModule = await import('@prisma/client')
const maintenanceUrl = new URL(targetUrl)
maintenanceUrl.pathname = '/postgres'
const maintenance = new prismaModule.PrismaClient({ datasources: { db: { url: maintenanceUrl.toString() } } })
const quotedTarget = `"${targetDatabase.replaceAll('"', '""')}"`
try {
  await maintenance.$connect()
  if (reset) {
    await maintenance.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${targetDatabase} AND pid <> pg_backend_pid()`
    await maintenance.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${quotedTarget}`)
  }
  try {
    await maintenance.$executeRawUnsafe(`CREATE DATABASE ${quotedTarget}`)
  } catch (error) {
    if (!/already exists/i.test(error instanceof Error ? error.message : String(error))) throw error
  }
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  if (/permission denied|createdb|must be owner/i.test(detail)) {
    throw new Error(`Could not create/reset demo database "${targetDatabase}": the PostgreSQL user may need CREATEDB permission. No command was run against "${sourceDatabase}". ${detail}`)
  }
  throw new Error(`Could not prepare demo database "${targetDatabase}". Check PostgreSQL is running and the connection permits access to its postgres maintenance database. No command was run against "${sourceDatabase}". ${detail}`)
} finally {
  await maintenance.$disconnect()
}

const migrationCli = resolve(process.cwd(), '../../node_modules/prisma/build/index.js')
try {
  execFileSync(process.execPath, [migrationCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
    cwd: process.cwd(), stdio: 'inherit', env: { ...process.env, DATABASE_URL: targetUrl },
  })
} catch {
  throw new Error(`Prisma migrations failed for the dedicated demo database "${targetDatabase}". The real database was not used.`)
}

// The demo connection is process-local and passed explicitly; .env is never edited.
const prisma = new prismaModule.PrismaClient({ datasources: { db: { url: targetUrl } } })

const communities = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Maple House', type: 'hostel' as const, inviteCode: 'DEMOH001', level1Label: 'Floor', level2Label: 'Room', level1Options: ['Basement', '1', '2', '3', '4', '5'] },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Cedar Apartments', type: 'apartment' as const, inviteCode: 'DEMOA001', level1Label: 'Tower', level2Label: 'Flat', level1Options: ['Tower A', 'Tower B', 'Tower C'] },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Northstar Studio', type: 'office' as const, inviteCode: 'DEMOO001', level1Label: 'Floor', level2Label: 'Desk', level1Options: ['1', '2', '3', '4', '5'] },
]

const people = [
  { id: '20000000-0000-4000-8000-000000000001', community: 0, name: 'Maya Example', email: 'demo1@example.test', level1: '2', level2: 'B16' },
  { id: '20000000-0000-4000-8000-000000000002', community: 0, name: 'Kabir Example', email: 'demo2@example.test', level1: 'Basement', level2: 'D3' },
  { id: '20000000-0000-4000-8000-000000000003', community: 0, name: 'Zoya Example', email: 'demo3@example.test', level1: '1', level2: 'A7' },
  { id: '20000000-0000-4000-8000-000000000004', community: 1, name: 'Asha Example', email: 'demo4@example.test', level1: 'Tower A', level2: '12B' },
  { id: '20000000-0000-4000-8000-000000000005', community: 1, name: 'Dev Example', email: 'demo5@example.test', level1: 'Tower B', level2: '4A' },
  { id: '20000000-0000-4000-8000-000000000006', community: 1, name: 'Ira Example', email: 'demo6@example.test', level1: 'Tower C', level2: '9C' },
  { id: '20000000-0000-4000-8000-000000000007', community: 2, name: 'Noah Example', email: 'demo7@example.test', level1: '2', level2: 'D-12' },
  { id: '20000000-0000-4000-8000-000000000008', community: 2, name: 'Riya Example', email: 'demo8@example.test', level1: '2', level2: null },
  { id: '20000000-0000-4000-8000-000000000009', community: 2, name: 'Sam Example', email: 'demo9@example.test', level1: '3', level2: 'D-08' },
] as const

const sampleItems = [
  ['Cordless drill', 'Compact drill with a charged battery and bits.', 'Tools', 'Good', 3],
  ['Steam iron', 'Lightweight iron with a working spray function.', 'Clothing/Laundry', 'Good', 2],
  ['Extension board', 'Four sockets and a two metre cable.', 'Electronics', 'Used', 2],
  ['Folding step stool', 'A sturdy stool for reaching high shelves.', 'Other', 'Good', 2],
  ['Electric kettle', 'Clean 1.5 litre kettle.', 'Kitchen', 'Good', 2],
  ['Yoga mat', 'Comfortable mat, cleaned after use.', 'Sports', 'Good', 2],
  ['Presentation clicker', 'Wireless clicker with a USB receiver.', 'Electronics', 'Good', 1],
  ['Desk lamp', 'LED lamp with adjustable brightness.', 'Study', 'Good', 4],
  ['Measuring tape', 'Five metre tape for workspace planning.', 'Tools', 'Good', 1],
] as const

const sampleRequests = [
  { id: '40000000-0000-4000-8000-000000000001', community: 0, item: 0, borrower: 1 },
  { id: '40000000-0000-4000-8000-000000000002', community: 1, item: 3, borrower: 4 },
]
const sampleWanted = [
  { id: '50000000-0000-4000-8000-000000000001', community: 0, author: 0, title: 'A bicycle pump', category: 'Sports', note: 'Could borrow one this weekend.' },
  { id: '50000000-0000-4000-8000-000000000002', community: 2, author: 6, title: 'A USB-C presentation adapter', category: 'Electronics', note: 'For a meeting tomorrow morning.' },
]

async function main() {
  for (const community of communities) {
    await prisma.community.upsert({
      where: { id: community.id },
      update: { name: community.name, type: community.type, inviteCode: community.inviteCode, level1Label: community.level1Label, level2Label: community.level2Label, level1Options: [...community.level1Options], isActive: true },
      create: { ...community, level1Options: [...community.level1Options] },
    })
  }

  for (const person of people) {
    const primaryCommunity = communities[person.community]
    await prisma.user.upsert({
      where: { id: person.id },
      update: { name: person.name, email: person.email, communityId: communities[0].id, joinedHostel: true },
      create: { id: person.id, name: person.name, email: person.email, communityId: communities[0].id, joinedHostel: true },
    })
    await prisma.communityMember.upsert({
      where: { communityId_userId: { communityId: primaryCommunity.id, userId: person.id } },
      update: { status: 'active', level1Value: person.level1, level2Value: person.level2, acceptedGuidelinesAt: new Date() },
      create: { communityId: primaryCommunity.id, userId: person.id, role: person.id === '20000000-0000-4000-8000-000000000001' || person.id === '20000000-0000-4000-8000-000000000004' || person.id === '20000000-0000-4000-8000-000000000007' ? 'admin' : 'member', status: 'active', level1Value: person.level1, level2Value: person.level2, acceptedGuidelinesAt: new Date() },
    })
  }

  for (let communityIndex = 0; communityIndex < communities.length; communityIndex++) {
    const admin = people.find((person) => person.community === communityIndex && person.id.endsWith('001'))!
    await prisma.community.update({ where: { id: communities[communityIndex].id }, data: { createdBy: admin.id } })
  }

  for (let index = 0; index < sampleItems.length; index++) {
    const [title, description, category, condition, maxLendDays] = sampleItems[index]
    const owner = people[index]
    const community = communities[owner.community]
    const id = `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
    await prisma.item.upsert({
      where: { id },
      update: { title, description, category, condition, maxLendDays, ownerId: owner.id, communityId: community.id, photos: [], status: 'available' },
      create: { id, title, description, category, condition, maxLendDays, ownerId: owner.id, communityId: community.id, photos: [] },
    })
  }

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const tomorrow = new Date(today.getTime() + 86_400_000)
  for (const entry of sampleRequests) {
    const owner = people[entry.item]
    const borrower = people[entry.borrower]
    const itemId = `30000000-0000-4000-8000-${String(entry.item + 1).padStart(12, '0')}`
    await prisma.borrowRequest.upsert({
      where: { id: entry.id },
      update: {},
      create: { id: entry.id, communityId: communities[entry.community].id, itemId, borrowerId: borrower.id, ownerId: owner.id, fromDate: today, toDate: tomorrow, note: 'Demo request — safe to reset in this demo database.' },
    })
  }
  for (const post of sampleWanted) {
    await prisma.wantedPost.upsert({
      where: { id: post.id },
      update: { title: post.title, category: post.category, note: post.note, status: 'open' },
      create: { id: post.id, communityId: communities[post.community].id, authorId: people[post.author].id, title: post.title, category: post.category, note: post.note },
    })
  }

  console.info('Demo data is ready. Start the isolated demo app with: npm run dev:demo')
  for (const community of communities) console.info(`- ${community.name} (${community.type}), invite code ${community.inviteCode}`)
  console.info(`- ${people.length} fake users: ${people.map((person) => person.email).join(', ')}`)
  console.info(`- ${sampleItems.length} items, ${sampleRequests.length} borrow requests, ${sampleWanted.length} wanted posts`)
  console.info('Open http://localhost:5173/login and choose “Sign in as a demo user”. These fake .test accounts are available only in dev:demo mode.')
}

main().catch((error: unknown) => {
  console.error('Demo seeding failed:', error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
