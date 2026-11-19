export const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    throw new ApiError(
      typeof payload?.error === 'string' ? payload.error : 'The request could not be completed.',
      response.status,
      payload?.details,
    )
  }
  return payload as T
}
