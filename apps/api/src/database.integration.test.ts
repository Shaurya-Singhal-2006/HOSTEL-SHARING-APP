import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { Express } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const testUrl = process.env.SMOKE_DATABASE_URL
function identity(raw: string) {
  const url = new URL(raw)
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1).split('/').at(-1) ?? '')}`
}
if (testUrl) {
  const testName = decodeURIComponent(new URL(testUrl).pathname.slice(1).split('/').at(-1) ?? '')
  if (!testName.endsWith('_test')) throw new Error('Refusing API integration tests: SMOKE_DATABASE_URL database name must end in _test.')
  if (process.env.DATABASE_URL && identity(testUrl) === identity(process.env.DATABASE_URL)) throw new Error('Refusing API integration tests: SMOKE_DATABASE_URL must differ from DATABASE_URL.')
  if (process.env.DEMO_DATABASE_URL && identity(testUrl) === identity(process.env.DEMO_DATABASE_URL)) throw new Error('Refusing API integration tests: SMOKE_DATABASE_URL must differ from DEMO_DATABASE_URL.')
}

const integration = testUrl ? describe : describe.skip
integration('API integration journeys (dedicated _test database only)', () => {
  let app: Express
  let prisma: (typeof import('./lib/prisma.js'))['prisma']
  let issueSession: (typeof import('./lib/session.js'))['issueSession']
  let communityId = ''
  let outsiderCommunityId = ''
  const userIds: string[] = []
  const itemIds: string[] = []
  const requestIds: string[] = []
  const wantedIds: string[] = []

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = testUrl!
    process.env.GOOGLE_CLIENT_ID ||= 'integration-test-client.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET ||= 'integration-test-client-secret'
    process.env.JWT_SECRET ||= 'integration-test-only-secret-with-32-characters'
    execFileSync(process.execPath, [resolve(process.cwd(), '../../node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { cwd: process.cwd(), stdio: 'inherit', env: process.env })
    ;[{ app }, { prisma }, { issueSession }] = await Promise.all([import('./app.js'), import('./lib/prisma.js'), import('./lib/session.js')])
    await prisma.$connect()

    const base = await prisma.community.create({ data: { name: `API test ${randomUUID()}`, type: 'apartment', inviteCode: randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase(), level1Label: 'Tower', level2Label: 'Flat', level1Options: ['Tower A'] } })
    communityId = base.id
    const other = await prisma.community.create({ data: { name: `API outsider ${randomUUID()}`, type: 'apartment', inviteCode: randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase(), level1Label: 'Tower', level2Label: 'Flat', level1Options: ['Tower A'] } })
    outsiderCommunityId = other.id
    const unique = randomUUID().slice(0, 8)
    const users = await Promise.all(['owner', 'borrower', 'second'].map((role) => prisma.user.create({ data: { name: `Test ${role}`, email: `${role}-${unique}@example.test`, phone: `+1555000${role === 'owner' ? '1' : role === 'borrower' ? '2' : '3'}`, communityId } })))
    userIds.push(...users.map((user) => user.id))
    await prisma.communityMember.createMany({ data: users.map((user, index) => ({ communityId, userId: user.id, role: index === 0 ? 'admin' : 'member', status: 'active', level1Value: 'Tower A', level2Value: `10${index}` })) })
    const outsider = await prisma.user.create({ data: { name: 'Test outsider', email: `outsider-${unique}@example.test`, communityId: outsiderCommunityId } })
    userIds.push(outsider.id)
    await prisma.communityMember.create({ data: { communityId: outsiderCommunityId, userId: outsider.id, status: 'active', level1Value: 'Tower A', level2Value: '101' } })
  }, 90000)

  afterAll(async () => {
    if (!prisma) return
    try {
      if (wantedIds.length) await prisma.wantedPost.deleteMany({ where: { id: { in: wantedIds } } })
      if (requestIds.length) await prisma.borrowRequest.deleteMany({ where: { id: { in: requestIds } } })
      if (itemIds.length) await prisma.item.deleteMany({ where: { id: { in: itemIds } } })
      if (userIds.length) await prisma.communityMember.deleteMany({ where: { userId: { in: userIds } } })
      if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      if (communityId) await prisma.community.deleteMany({ where: { id: { in: [communityId, outsiderCommunityId] } } })
    } finally {
      await prisma.$disconnect()
    }
  })

  it('isolates communities, enforces accepted-contact privacy, serializes booking races, rates, and fulfills wanted posts', async () => {
    const { prisma: db } = await import('./lib/prisma.js')
    const [ownerId, borrowerId, secondId, outsider] = userIds
    const memberRequest = (userId: string, community = communityId) => request(app).set('Cookie', `lendloop_session=${issueSession(userId)}`).set('X-Community-Id', community)
    const memberList = await memberRequest(ownerId).get(`/api/v1/communities/${communityId}/members`)
    expect(memberList.status).toBe(200)
    expect(JSON.stringify(memberList.body)).not.toContain('@example.test')

    const itemResult = await memberRequest(ownerId).post('/api/v1/items').send({ title: 'Integration toolkit', category: 'Tools', max_lend_days: 3 })
    expect(itemResult.status).toBe(201)
    const itemId = itemResult.body.item.id as string
    itemIds.push(itemId)
    const crossCommunity = await memberRequest(outsider, outsiderCommunityId).get(`/api/v1/items/${itemId}`)
    expect(crossCommunity.status).toBe(404)

    const today = new Date().toISOString().slice(0, 10)
    const first = await memberRequest(borrowerId).post('/api/v1/requests').send({ itemId, fromDate: today, toDate: today })
    expect(first.status).toBe(201)
    const firstId = first.body.request.id as string
    requestIds.push(firstId)
    expect(first.body.request.other.phone).toBeUndefined()
    const accepted = await memberRequest(ownerId).patch(`/api/v1/requests/${firstId}/accept`).send({})
    expect(accepted.status).toBe(200)
    expect(accepted.body.request.other.phone).toBeTruthy()
    const returned = await memberRequest(ownerId).patch(`/api/v1/requests/${firstId}/return`).send({})
    expect(returned.status).toBe(200)
    const rating = await memberRequest(borrowerId).post('/api/v1/ratings').send({ requestId: firstId, thumbsUp: true, comment: 'Easy exchange' })
    expect(rating.status).toBe(201)
    expect(rating.body.trustScore).toBeGreaterThanOrEqual(1)

    const wanted = await memberRequest(ownerId).post('/api/v1/wanted').send({ title: 'Integration wanted drill', category: 'Tools' })
    expect(wanted.status).toBe(201)
    const wantedId = wanted.body.post.id as string
    wantedIds.push(wantedId)
    const response = await memberRequest(borrowerId).post(`/api/v1/wanted/${wantedId}/respond`).send({ message: 'I can lend this.' })
    expect(response.status).toBe(201)
    const responseId = response.body.response.id as string
    const openPost = await memberRequest(ownerId).get(`/api/v1/wanted/${wantedId}`)
    expect(openPost.body.post.responses[0].responder.phone).toBeUndefined()
    const fulfilled = await memberRequest(ownerId).patch(`/api/v1/wanted/${wantedId}/fulfill`).send({ responseId })
    expect(fulfilled.status).toBe(200)
    const selectedPost = await memberRequest(ownerId).get(`/api/v1/wanted/${wantedId}`)
    expect(selectedPost.body.post.responses[0].responder.phone).toBeTruthy()

    const pendingA = await memberRequest(borrowerId).post('/api/v1/requests').send({ itemId, fromDate: today, toDate: today })
    const pendingB = await memberRequest(secondId).post('/api/v1/requests').send({ itemId, fromDate: today, toDate: today })
    expect(pendingA.status).toBe(201)
    expect(pendingB.status).toBe(201)
    const pendingIds = [pendingA.body.request.id, pendingB.body.request.id] as string[]
    requestIds.push(...pendingIds)
    const outcomes = await Promise.all(pendingIds.map((id) => memberRequest(ownerId).patch(`/api/v1/requests/${id}/accept`).send({})))
    expect(outcomes.filter((result) => result.status === 200)).toHaveLength(1)
    expect(outcomes.every((result) => result.status === 200 || result.status === 409)).toBe(true)
    const score = await db.communityMember.findUnique({ where: { communityId_userId: { communityId, userId: ownerId } }, select: { trustScore: true } })
    expect(score?.trustScore).toBeGreaterThanOrEqual(1)
  }, 90000)
})
