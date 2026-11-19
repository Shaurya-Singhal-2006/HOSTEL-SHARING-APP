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

export function apiUpload<T>(path: string, body: FormData, method: 'POST' | 'PATCH', onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open(method, `${API_BASE}${path}`)
    request.withCredentials = true
    request.setRequestHeader('Accept', 'application/json')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new ApiError('Could not reach the server. Check your connection and try again.', 0))
    request.onabort = () => reject(new ApiError('The upload was cancelled.', 0))
    request.onload = () => {
      const contentType = request.getResponseHeader('content-type') ?? ''
      let payload: unknown = null
      try { if (contentType.includes('application/json')) payload = JSON.parse(request.responseText) as unknown } catch { payload = null }
      if (request.status < 200 || request.status >= 300) {
        const value = payload as { error?: unknown; details?: Record<string, string[]> } | null
        reject(new ApiError(typeof value?.error === 'string' ? value.error : 'The upload could not be completed.', request.status, value?.details))
        return
      }
      resolve(payload as T)
    }
    request.send(body)
  })
}
