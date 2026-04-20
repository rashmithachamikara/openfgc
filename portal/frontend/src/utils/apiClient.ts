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
