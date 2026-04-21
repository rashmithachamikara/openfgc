export interface APIErrorPayload {
  code?: string
  message?: string
}

export class APIError extends Error {
  public readonly status: number

  public readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>
}

/**
 * Builds an absolute request URL from the configured API base URL and query params.
 */
function buildURL(path: string, query?: RequestOptions['query']): string {
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${normalizedBase}${normalizedPath}`)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) {
        return
      }
      url.searchParams.set(key, String(value))
    })
  }

  return url.toString()
}

/**
 * Sends an API request and parses the response body as JSON.
 *
 * Use this helper for endpoints that always return a JSON payload.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, headers, ...requestInit } = options
  const response = await fetch(buildURL(path, query), {
    credentials: 'include',
    ...requestInit,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    let payload: APIErrorPayload | undefined

    try {
      payload = (await response.json()) as APIErrorPayload
    } catch {
      payload = undefined
    }

    throw new APIError(
      response.status,
      payload?.code ?? 'API_REQUEST_FAILED',
      payload?.message ?? `request failed with status ${response.status}`,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/**
 * Sends an API request for endpoints that are expected to return no content.
 *
 * This helper is intended for APIs that commonly respond with HTTP 204.
 * If a successful response includes a payload unexpectedly, it is ignored.
 */
export async function apiRequestNoContent(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  const { query, headers, ...requestInit } = options
  const response = await fetch(buildURL(path, query), {
    credentials: 'include',
    ...requestInit,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    let payload: APIErrorPayload | undefined

    try {
      payload = (await response.json()) as APIErrorPayload
    } catch {
      payload = undefined
    }

    throw new APIError(
      response.status,
      payload?.code ?? 'API_REQUEST_FAILED',
      payload?.message ?? `request failed with status ${response.status}`,
    )
  }
}
