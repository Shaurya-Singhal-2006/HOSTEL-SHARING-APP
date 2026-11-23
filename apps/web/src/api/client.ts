export const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

let activeCommunityId: string | null = null
export function setRequestCommunityId(id: string | null) { activeCommunityId = id }
export function communityAssetUrl(value: string): string {
  const id = activeCommunityId ?? (() => { try { return window.localStorage.getItem('lendloop.activeCommunityId') } catch { return null } })()
  if (!id) return value
  try {
    const url = new URL(value, window.location.href)
    if (url.pathname.includes('/uploads/')) url.searchParams.set('communityId', id)
    return url.toString()
  } catch { return value }
}

function communityIdForRequest(path: string): string | null {
  if (/^\/api\/(?:me(?:\/|\?|$)|auth(?:\/|\?|$))/.test(path)) return null
  if (/^\/api\/communities(?:\?|$)/.test(path) || /^\/api\/communities\/(?:mine|join)(?:\/|\?|$)/.test(path)) return null
  if (!path.startsWith('/api/')) return null
  if (activeCommunityId) return activeCommunityId
  try { return window.localStorage.getItem('lendloop.activeCommunityId') } catch { return null }
}

function addCommunityHeader(headers: Headers, path: string) {
  const communityId = communityIdForRequest(path)
  if (communityId) headers.set('X-Community-Id', communityId)
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: Record<string, string[]>, public readonly code = 'REQUEST_FAILED') {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

function versionedPath(path: string): string {
  return path.startsWith('/api/') && !path.startsWith('/api/v1/') ? path.replace(/^\/api\//, '/api/v1/') : path
}

function errorPayload(payload: unknown): { message?: string; code?: string; details?: Record<string, string[]> } {
  if (!payload || typeof payload !== 'object') return {}
  const root = payload as { error?: unknown; details?: unknown }
  if (root.error && typeof root.error === 'object') {
    const error = root.error as { message?: unknown; code?: unknown; details?: unknown }
    const details = error.details && typeof error.details === 'object' ? error.details as Record<string, string[]> : undefined
    return {
      message: typeof error.message === 'string' ? error.message : undefined,
      code: typeof error.code === 'string' ? error.code : undefined,
      details,
    }
  }
  return {
    message: typeof root.error === 'string' ? root.error : undefined,
    code: 'REQUEST_FAILED',
    details: root.details && typeof root.details === 'object' ? root.details as Record<string, string[]> : undefined,
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')
  addCommunityHeader(headers, path)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${versionedPath(path)}`, {
      ...options,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('LendLoop took too long to respond. Please try again.', 504)
    }
    throw new ApiError("We can't reach LendLoop right now. Check your connection and try again.", 0)
  }
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    const apiError = errorPayload(payload)
    if (response.status === 404 && apiError.code === 'COMMUNITY_NOT_FOUND') window.dispatchEvent(new CustomEvent('lendloop:community-invalid'))
    throw new ApiError(
      apiError.message ?? 'The request could not be completed.',
      response.status,
      apiError.details,
      apiError.code,
    )
  }
  return payload as T
}

export function apiUpload<T>(path: string, body: FormData, method: 'POST' | 'PATCH', onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open(method, `${API_BASE}${versionedPath(path)}`)
    request.withCredentials = true
    request.setRequestHeader('Accept', 'application/json')
    const communityId = communityIdForRequest(path)
    if (communityId) request.setRequestHeader('X-Community-Id', communityId)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new ApiError("We can't reach LendLoop right now. Check your connection and try again.", 0))
    request.onabort = () => reject(new ApiError('The upload was cancelled.', 0))
    request.onload = () => {
      const contentType = request.getResponseHeader('content-type') ?? ''
      let payload: unknown = null
      try { if (contentType.includes('application/json')) payload = JSON.parse(request.responseText) as unknown } catch { payload = null }
      if (request.status < 200 || request.status >= 300) {
        const value = errorPayload(payload)
        if (request.status === 404 && value.code === 'COMMUNITY_NOT_FOUND') window.dispatchEvent(new CustomEvent('lendloop:community-invalid'))
        reject(new ApiError(value.message ?? 'The upload could not be completed.', request.status, value.details, value.code))
        return
      }
      resolve(payload as T)
    }
    request.send(body)
  })
}
