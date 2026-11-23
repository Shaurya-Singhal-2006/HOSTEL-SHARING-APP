import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

describe('P1 API surface', () => {
  let app: Express

  beforeAll(async () => {
    process.env.NODE_ENV = 'development'
    const module = await import('./app.js')
    app = module.app
  })

  afterAll(async () => {
    const { prisma } = await import('./lib/prisma.js')
    await prisma.$disconnect()
  })

  it.each(['/api/health', '/api/v1/health'])('%s exposes liveness without touching the database', async (path) => {
    const response = await request(app).get(path)
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i)
    expect(response.headers['content-security-policy']).toContain("default-src 'none'")
  })

  it('keeps old and versioned protected routes as aliases', async () => {
    const [legacy, versioned] = await Promise.all([
      request(app).get('/api/me'),
      request(app).get('/api/v1/me'),
    ])
    expect(legacy.status).toBe(401)
    expect(versioned.status).toBe(401)
    expect(legacy.body.error.code).toBe(versioned.body.error.code)
    expect(legacy.body.error.message).toBeTruthy()
  })

  it('serves OpenAPI documentation only on the development route', async () => {
    const response = await request(app).get('/api/docs')
    expect(response.status).toBe(200)
    expect(response.body.openapi).toMatch(/^3\./)
    expect(response.body.paths['/items']).toBeDefined()
  })

  it('uses a consistent structured 404 response', async () => {
    const response = await request(app).get('/api/v1/not-a-route')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found.' } })
  })
})
