/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../utils/apiClient'
import { getUserProfile, readCookie } from '../utils/authClient'

function setCookie(name: string, value: string): void {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/`
}

function clearCookies(): void {
  document.cookie.split(';').forEach((item) => {
    const name = item.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; Max-Age=0; Path=/`
    }
  })
}

afterEach(() => {
  clearCookies()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('portal auth client', () => {
  it('reconstructs and decodes display-only ID-token cookies', () => {
    const payload = btoa(JSON.stringify({ sub: 'user-1', name: 'Portal User' }))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    const token = `header.${payload}.signature`
    const midpoint = Math.floor(token.length / 2)
    setCookie('portal-id-p1', token.slice(0, midpoint))
    setCookie('portal-id-p2', token.slice(midpoint))

    expect(getUserProfile()).toMatchObject({ sub: 'user-1', name: 'Portal User' })
    expect(readCookie('portal-id-p1')).toBe(token.slice(0, midpoint))
  })

  it('deduplicates concurrent refreshes and retries each request once', async () => {
    vi.stubEnv('VITE_AUTH_ENABLED', 'true')
    setCookie('portal-at-p1', 'old-access-part')
    setCookie('portal-rt-p1', 'refresh-part')

    let apiCalls = 0
    let refreshCalls = 0
    const retryHeaders: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestURL = String(input)
      if (requestURL.endsWith('/auth/refresh')) {
        refreshCalls += 1
        setCookie('portal-at-p1', 'new-access-part')
        return new Response(null, { status: 204 })
      }
      apiCalls += 1
      if (apiCalls <= 2) {
        return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      retryHeaders.push(new Headers(init?.headers).get('Authorization') ?? '')
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([apiRequest('/first'), apiRequest('/second')])

    expect(refreshCalls).toBe(1)
    expect(apiCalls).toBe(4)
    expect(retryHeaders).toEqual(['Bearer new-access-part', 'Bearer new-access-part'])
  })
})
