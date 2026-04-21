import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AcrylicOrangeTheme, CssBaseline, OxygenUIThemeProvider } from '@wso2/oxygen-ui'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConsentRegistryPage from '../features/consent-registry/ConsentRegistryPage'
import i18n from '../i18n/i18n'

const fetchMock = vi.fn()

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function renderConsentRegistryPage(queryClient: QueryClient): void {
  render(
    <OxygenUIThemeProvider theme={AcrylicOrangeTheme}>
      <CssBaseline />
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ConsentRegistryPage />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </OxygenUIThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('ConsentRegistryPage', () => {
  it('renders page heading, filters, and grouped consent rows', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'CON-8291',
            clientId: 'Tesco_Bank_v1',
            type: 'Accounts',
            status: 'ACTIVE',
            createdTime: 1702800000,
            updatedTime: 1702800000,
            purposes: [
              {
                name: 'Marketing',
                elements: [],
              },
            ],
          },
        ],
        metadata: {
          total: 1,
          offset: 0,
          count: 1,
          limit: 10,
        },
      }),
    })

    const queryClient = createQueryClient()

    renderConsentRegistryPage(queryClient)

    expect(await screen.findByRole('heading', { name: 'All Consents' })).toBeInTheDocument()
    expect(screen.getByLabelText('Consent filters')).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Consent registry table' })).toBeInTheDocument()
    expect(await screen.findByText('Client: Tesco_Bank_v1')).toBeInTheDocument()
    expect(await screen.findByText('#CON-8291')).toBeInTheDocument()
  })

  it('shows an error message when consent fetch fails', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong.',
      }),
    })

    const queryClient = createQueryClient()

    renderConsentRegistryPage(queryClient)

    expect(await screen.findByRole('heading', { name: 'All Consents' })).toBeInTheDocument()
    expect(await screen.findByText('Unable to load consents right now.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Consent registry table' })).not.toBeInTheDocument()
  })

  it('does not render approve action for rejected consents', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'CON-9123',
            clientId: 'Sample_Client',
            type: 'Accounts',
            status: 'REJECTED',
            createdTime: 1702800000,
            updatedTime: 1702800000,
            purposes: [
              {
                name: 'Marketing',
                elements: [],
              },
            ],
          },
        ],
        metadata: {
          total: 1,
          offset: 0,
          count: 1,
          limit: 10,
        },
      }),
    })

    const queryClient = createQueryClient()

    renderConsentRegistryPage(queryClient)

    expect(await screen.findByRole('table', { name: 'Consent registry table' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Approve')).not.toBeInTheDocument()
  })
})
