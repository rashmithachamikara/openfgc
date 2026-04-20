import { afterEach, describe, expect, it, vi } from 'vitest'
import { approveMyConsent } from '../features/consent-registry/api/consentsApi'

const fetchMock = vi.fn()

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('approveMyConsent', () => {
  it('sends selected optional approvals to the BFF approve endpoint', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const selectedOptionalElements = [{ purposeName: 'profile_access', elementName: 'last_name' }]

    await approveMyConsent('consent-123', selectedOptionalElements)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? []

    expect(String(requestUrl)).toContain('/me/consents/consent-123/approve')
    expect(requestInit).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(selectedOptionalElements),
    })
  })
})
