export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function defaultCode(status: number): string {
  if (status === 400) return 'BAD_REQUEST'
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'SERVICE_ERROR'
  return 'REQUEST_FAILED'
}

/** Backwards-compatible name used by existing controllers. */
export class HttpError extends AppError {
  public readonly status: number

  constructor(status: number, message: string, code = defaultCode(status), details?: unknown) {
    super(status, code, message, details)
    this.name = 'HttpError'
    this.status = status
  }
}

export function errorResponse(code: string, message: string, details?: unknown) {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } }
}
