import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { createItemSchema } from '../controllers/items.schema.js'
import { createCommunitySchema, joinCommunitySchema } from '../controllers/communities.schema.js'

extendZodWithOpenApi(z)
const registry = new OpenAPIRegistry()
const error = registry.register('ErrorResponse', z.object({ error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }) }))
const communityHeader = z.object({ 'X-Community-Id': z.string().uuid() })
const body = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } })
const response = (description: string, schema: z.ZodTypeAny) => ({ description, content: { 'application/json': { schema } } })
const ok = z.object({ ok: z.boolean() })
const pageQuery = z.object({ page: z.coerce.number().int().positive().optional(), search: z.string().optional() })
const idParam = z.object({ id: z.string().uuid() })

const createCommunity = registry.register('CreateCommunity', createCommunitySchema)
const joinCommunity = registry.register('JoinCommunity', joinCommunitySchema)
const createItem = registry.register('CreateItem', createItemSchema)
const createRequest = registry.register('CreateBorrowRequest', z.object({ itemId: z.string().uuid(), fromDate: z.string().date(), toDate: z.string().date(), note: z.string().max(300).optional() }))
const createWanted = registry.register('CreateWantedPost', z.object({ title: z.string().min(1).max(80), category: z.string(), note: z.string().max(300).optional(), neededBy: z.string().date().nullable().optional() }))

registry.registerComponent('securitySchemes', 'sessionCookie', { type: 'apiKey', in: 'cookie', name: 'lendloop_session' })
registry.registerPath({ method: 'get', path: '/health', tags: ['health'], summary: 'Liveness probe', responses: { 200: response('API process is alive.', z.object({ status: z.literal('ok') })) } })
registry.registerPath({ method: 'get', path: '/ready', tags: ['health'], summary: 'Readiness probe', responses: { 200: response('Database ready.', z.object({ status: z.literal('ok'), database: z.literal('ok') })), 503: response('Database unavailable.', error) } })
registry.registerPath({ method: 'get', path: '/auth/google', tags: ['auth'], summary: 'Start Google OAuth', responses: { 302: { description: 'Redirects to Google consent.' } } })
registry.registerPath({ method: 'post', path: '/auth/logout', tags: ['auth'], summary: 'Sign out', security: [{ sessionCookie: [] }], responses: { 200: response('Session cookie cleared.', ok) } })
registry.registerPath({ method: 'get', path: '/me', tags: ['users'], summary: 'Get current user', security: [{ sessionCookie: [] }], responses: { 200: response('Current user.', z.object({ user: z.record(z.string(), z.unknown()) })), 401: response('Sign-in required.', error) } })
registry.registerPath({ method: 'patch', path: '/me', tags: ['users'], summary: 'Update current user', security: [{ sessionCookie: [] }], request: { body: body(z.object({ name: z.string().min(1).max(80).optional(), phone: z.string().max(30).nullable().optional() })) }, responses: { 200: response('Profile updated.', ok), 400: response('Invalid profile.', error) } })
registry.registerPath({ method: 'get', path: '/communities/mine', tags: ['communities'], summary: 'List memberships', security: [{ sessionCookie: [] }], responses: { 200: response('User memberships.', z.object({ communities: z.array(z.record(z.string(), z.unknown())) })) } })
registry.registerPath({ method: 'post', path: '/communities', tags: ['communities'], summary: 'Create a community', security: [{ sessionCookie: [] }], request: { body: body(createCommunity) }, responses: { 201: response('Community created.', z.object({ community: z.record(z.string(), z.unknown()) })), 400: response('Invalid community.', error) } })
registry.registerPath({ method: 'post', path: '/communities/join', tags: ['communities'], summary: 'Join a community', security: [{ sessionCookie: [] }], request: { body: body(joinCommunity), headers: communityHeader }, responses: { 200: response('Membership activated.', ok), 202: response('Membership pending.', ok), 404: response('Community not found.', error) } })
registry.registerPath({ method: 'get', path: '/items', tags: ['items'], summary: 'Browse items', security: [{ sessionCookie: [] }], request: { headers: communityHeader, query: pageQuery }, responses: { 200: response('Paginated items.', z.object({ items: z.array(z.record(z.string(), z.unknown())), pagination: z.record(z.string(), z.unknown()) })) } })
registry.registerPath({ method: 'post', path: '/items', tags: ['items'], summary: 'Create an item', security: [{ sessionCookie: [] }], request: { headers: communityHeader, body: body(createItem) }, responses: { 201: response('Item created.', z.object({ item: z.record(z.string(), z.unknown()) })), 400: response('Invalid item.', error) } })
registry.registerPath({ method: 'get', path: '/items/{id}', tags: ['items'], summary: 'Get an item', security: [{ sessionCookie: [] }], request: { headers: communityHeader, params: idParam }, responses: { 200: response('Item details.', z.object({ item: z.record(z.string(), z.unknown()) })), 404: response('Item not found.', error) } })
registry.registerPath({ method: 'post', path: '/requests', tags: ['requests'], summary: 'Request an item', security: [{ sessionCookie: [] }], request: { headers: communityHeader, body: body(createRequest) }, responses: { 201: response('Borrow request created.', z.object({ request: z.record(z.string(), z.unknown()) })), 409: response('Item unavailable.', error) } })
registry.registerPath({ method: 'patch', path: '/requests/{id}/accept', tags: ['requests'], summary: 'Accept a borrow request', security: [{ sessionCookie: [] }], request: { headers: communityHeader, params: idParam }, responses: { 200: response('Request accepted.', ok), 409: response('Request cannot be accepted.', error) } })
registry.registerPath({ method: 'patch', path: '/requests/{id}/return', tags: ['requests'], summary: 'Mark an item returned', security: [{ sessionCookie: [] }], request: { headers: communityHeader, params: idParam }, responses: { 200: response('Request returned.', ok) } })
registry.registerPath({ method: 'get', path: '/wanted', tags: ['wanted'], summary: 'List wanted posts', security: [{ sessionCookie: [] }], request: { headers: communityHeader, query: pageQuery }, responses: { 200: response('Paginated wanted posts.', z.object({ posts: z.array(z.record(z.string(), z.unknown())), pagination: z.record(z.string(), z.unknown()) })) } })
registry.registerPath({ method: 'post', path: '/wanted', tags: ['wanted'], summary: 'Create a wanted post', security: [{ sessionCookie: [] }], request: { headers: communityHeader, body: body(createWanted) }, responses: { 201: response('Wanted post created.', z.object({ post: z.record(z.string(), z.unknown()) })) } })
registry.registerPath({ method: 'post', path: '/wanted/{id}/respond', tags: ['wanted'], summary: 'Respond to a wanted post', security: [{ sessionCookie: [] }], request: { headers: communityHeader, params: idParam, body: body(z.object({ message: z.string().max(200).optional() })) }, responses: { 201: response('Response created.', ok), 409: response('Already responded or post closed.', error) } })
registry.registerPath({ method: 'get', path: '/notifications', tags: ['notifications'], summary: 'List notifications', security: [{ sessionCookie: [] }], request: { headers: communityHeader }, responses: { 200: response('Notifications for the active community.', z.object({ notifications: z.array(z.record(z.string(), z.unknown())) })) } })
registry.registerPath({ method: 'post', path: '/reports', tags: ['safety'], summary: 'Report a user or item', security: [{ sessionCookie: [] }], request: { headers: communityHeader, body: body(z.object({ targetType: z.enum(['user', 'item']), targetId: z.string().uuid(), reason: z.string().min(3).max(1000) })) }, responses: { 201: response('Report submitted.', ok) } })

export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.3',
  info: { title: 'LendLoop API', version: '1.0.0', description: 'Community-scoped API. Send X-Community-Id for community routes.' },
  servers: [{ url: '/api/v1' }],
})
