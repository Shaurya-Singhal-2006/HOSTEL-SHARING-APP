import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const smokeUrl = process.env.SMOKE_DATABASE_URL
if (!smokeUrl) throw new Error('Set SMOKE_DATABASE_URL to a dedicated database ending in _test. DATABASE_URL is never used by this test.')
const parsedSmokeUrl = new URL(smokeUrl)
const databaseName = decodeURIComponent(parsedSmokeUrl.pathname.slice(1).split('/').at(-1) ?? '')
if (!databaseName.endsWith('_test')) throw new Error('Refusing to run smoke test: the SMOKE_DATABASE_URL database name must end in _test.')
const connectionIdentity = (value: string) => {
  const url = new URL(value)
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1).split('/').at(-1) ?? '')}`
}
if (process.env.DATABASE_URL && connectionIdentity(smokeUrl) === connectionIdentity(process.env.DATABASE_URL)) {
  throw new Error('Refusing to run smoke test: SMOKE_DATABASE_URL must differ from DATABASE_URL.')
}
if (process.env.DEMO_DATABASE_URL && connectionIdentity(smokeUrl) === connectionIdentity(process.env.DEMO_DATABASE_URL)) {
  throw new Error('Refusing to run smoke test: SMOKE_DATABASE_URL must differ from DEMO_DATABASE_URL.')
}

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = smokeUrl
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'smoke-test-client-id.apps.googleusercontent.com'
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'smoke-test-client-secret'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-only-secret-with-at-least-32-characters'
process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:5173'

execFileSync(process.execPath, [resolve(process.cwd(), '../../node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { cwd: process.cwd(), stdio: 'inherit', env: process.env })

const [{ app }, { prisma }, { issueSession }] = await Promise.all([
  import('./app.js'),
  import('./lib/prisma.js'),
  import('./lib/session.js'),
])
const server = app.listen(0, '127.0.0.1')
const createdCommunityIds: string[] = []
const userIds: string[] = []
const itemIds: string[] = []
const requestIds: string[] = []
const wantedIds: string[] = []
let testUserIds: string[] = []

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke check failed: ${message}`)
}

type ApiResult = { response: Response; body: any }
async function call(baseUrl: string, method: string, path: string, userId: string, communityId?: string, body?: unknown): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      cookie: `lendloop_session=${issueSession(userId)}`,
      ...(communityId ? { 'X-Community-Id': communityId } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let parsed: any
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { response, body: parsed }
}

try {
  await prisma.$connect()
  const serverAddress = await new Promise<AddressInfo>((resolve, reject) => {
    server.once('error', reject)
    server.once('listening', () => resolve(server.address() as AddressInfo))
  })
  const baseUrl = `http://127.0.0.1:${serverAddress.port}`

  const bootstrap = await prisma.community.create({ data: { name: `Smoke bootstrap ${randomUUID()}`, type: 'other', inviteCode: randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase() } })
  createdCommunityIds.push(bootstrap.id)
  const unique = randomUUID().slice(0, 8)
  const owner = await prisma.user.create({ data: { name: 'Smoke Owner', email: `owner-${unique}@example.test`, communityId: bootstrap.id, joinedHostel: true } })
  const borrower = await prisma.user.create({ data: { name: 'Smoke Borrower', email: `borrower-${unique}@example.test`, communityId: bootstrap.id, joinedHostel: true } })
  const otherMember = await prisma.user.create({ data: { name: 'Smoke Other Member', email: `other-${unique}@example.test`, communityId: bootstrap.id, joinedHostel: true } })
  userIds.push(owner.id, borrower.id, otherMember.id)
  testUserIds = [...userIds]
  await prisma.communityMember.createMany({ data: [
    { communityId: bootstrap.id, userId: owner.id, role: 'admin', status: 'active', level1Value: '1', level2Value: 'A1' },
    { communityId: bootstrap.id, userId: borrower.id, role: 'member', status: 'active', level1Value: '1', level2Value: 'A2' },
    { communityId: bootstrap.id, userId: otherMember.id, role: 'member', status: 'active', level1Value: '1', level2Value: 'A3' },
  ] })
  const otherCommunity = await prisma.community.create({ data: { name: `Smoke Other ${unique}`, type: 'apartment', inviteCode: randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase(), level1Label: 'Tower', level2Label: 'Flat' } })
  createdCommunityIds.push(otherCommunity.id)
  await prisma.communityMember.create({ data: { communityId: otherCommunity.id, userId: otherMember.id, status: 'active', level1Value: 'Tower B', level2Value: '2C' } })

  const health = await fetch(`${baseUrl}/api/health`)
  assert(health.status === 200, `/api/health returned ${health.status}`)
  console.info('PASS /api/health')

  const created = await call(baseUrl, 'POST', '/api/communities', owner.id, undefined, {
    name: `Smoke Apartment ${unique}`, type: 'apartment', labels: { level1: 'Tower', level2: 'Flat' }, level1Options: ['Tower A', 'Tower B'],
  })
  assert(created.response.status === 201, `create community returned ${created.response.status}: ${JSON.stringify(created.body)}`)
  const community = created.body.community
  createdCommunityIds.push(community.id)
  console.info('PASS create community')

  const joined = await call(baseUrl, 'POST', '/api/communities/join', borrower.id, community.id, {
    inviteCode: community.inviteCode, level1: 'Tower A', level2: '12B', acceptGuidelines: true,
  })
  assert(joined.response.status === 200, `join community returned ${joined.response.status}: ${JSON.stringify(joined.body)}`)
  console.info('PASS join by invite code from second user')

  const ownerProfile = await call(baseUrl, 'PATCH', `/api/communities/${community.id}/me`, owner.id, community.id, { level1: 'Tower A', level2: '10A' })
  assert(ownerProfile.response.status === 200, `complete owner location returned ${ownerProfile.response.status}: ${JSON.stringify(ownerProfile.body)}`)

  const createdItem = await call(baseUrl, 'POST', '/api/items', owner.id, community.id, {
    title: 'Smoke test toolkit', description: 'A test listing.', category: 'Tools', condition: 'Good', max_lend_days: 5,
  })
  assert(createdItem.response.status === 201, `create item returned ${createdItem.response.status}: ${JSON.stringify(createdItem.body)}`)
  const itemId = createdItem.body.item.id as string
  itemIds.push(itemId)
  console.info('PASS add item')

  const today = new Date().toISOString().slice(0, 10)
  const request = await call(baseUrl, 'POST', '/api/requests', borrower.id, community.id, { itemId, fromDate: today, toDate: today, note: 'Smoke test borrow.' })
  assert(request.response.status === 201, `request item returned ${request.response.status}: ${JSON.stringify(request.body)}`)
  const requestId = request.body.request.id as string
  requestIds.push(requestId)
  console.info('PASS request item')

  const accepted = await call(baseUrl, 'PATCH', `/api/requests/${requestId}/accept`, owner.id, community.id, {})
  assert(accepted.response.status === 200 && accepted.body.request.status === 'accepted', `accept request returned ${accepted.response.status}: ${JSON.stringify(accepted.body)}`)
  const returned = await call(baseUrl, 'PATCH', `/api/requests/${requestId}/return`, owner.id, community.id, {})
  assert(returned.response.status === 200 && returned.body.request.status === 'returned', `return request returned ${returned.response.status}: ${JSON.stringify(returned.body)}`)
  console.info('PASS accept and return request')

  const post = await call(baseUrl, 'POST', '/api/wanted', owner.id, community.id, { title: 'Smoke wanted item', category: 'Tools', note: 'Wanted smoke test.' })
  assert(post.response.status === 201, `wanted post returned ${post.response.status}: ${JSON.stringify(post.body)}`)
  const wantedId = post.body.post.id as string
  wantedIds.push(wantedId)
  const response = await call(baseUrl, 'POST', `/api/wanted/${wantedId}/respond`, borrower.id, community.id, { message: 'I can help with this.' })
  assert(response.response.status === 201, `wanted response returned ${response.response.status}: ${JSON.stringify(response.body)}`)
  console.info('PASS post wanted request and respond')

  const crossCommunity = await call(baseUrl, 'GET', `/api/items/${itemId}`, otherMember.id, otherCommunity.id)
  assert(crossCommunity.response.status === 404, `cross-community item access returned ${crossCommunity.response.status}, expected 404`)
  console.info('PASS another community receives 404 for the item')
  console.info('All smoke checks passed.')
} finally {
  try {
    if (wantedIds.length) await prisma.wantedPost.deleteMany({ where: { id: { in: wantedIds } } })
    if (requestIds.length) await prisma.borrowRequest.deleteMany({ where: { id: { in: requestIds } } })
    if (itemIds.length) await prisma.item.deleteMany({ where: { id: { in: itemIds } } })
    if (userIds.length) await prisma.communityMember.deleteMany({ where: { userId: { in: userIds } } })
    if (testUserIds.length) await prisma.user.deleteMany({ where: { id: { in: testUserIds } } })
    if (createdCommunityIds.length) await prisma.community.deleteMany({ where: { id: { in: createdCommunityIds } } })
  } catch (cleanupError) {
    console.error('Smoke test cleanup failed in the dedicated _test database:', cleanupError)
    process.exitCode = 1
  }
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await prisma.$disconnect()
}
