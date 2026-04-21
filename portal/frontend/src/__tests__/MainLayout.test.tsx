import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AcrylicOrangeTheme, CssBaseline, OxygenUIThemeProvider } from '@wso2/oxygen-ui'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MainLayout from '../components/layout/main-layout/MainLayout'
import i18n from '../i18n/i18n'

interface MockSidebarProps {
  collapsed: boolean
}

vi.mock('../components/layout/sidebar/AppSidebar', () => ({
  default: ({ collapsed }: MockSidebarProps): React.JSX.Element => (
    <div data-testid="app-sidebar" data-collapsed={String(collapsed)} />
  ),
}))

afterEach(() => {
  cleanup()
})

function renderMainLayout(initialRoute = '/'): void {
  render(
    <OxygenUIThemeProvider theme={AcrylicOrangeTheme}>
      <CssBaseline />
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<h1>Nested route content</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </OxygenUIThemeProvider>,
  )
}

describe('MainLayout', () => {
  it('renders translated header title and avatar aria label', () => {
    renderMainLayout()

    expect(screen.getByText('Consent Portal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signed-in user avatar' })).toBeInTheDocument()
  })

  it('toggles sidebar collapsed state when header toggle is clicked', () => {
    renderMainLayout()

    const sidebar = screen.getByTestId('app-sidebar')
    const toggleButton = screen.getAllByRole('button')[0]

    expect(sidebar).toHaveAttribute('data-collapsed', 'false')

    fireEvent.click(toggleButton)
    expect(sidebar).toHaveAttribute('data-collapsed', 'true')

    fireEvent.click(toggleButton)
    expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  })

  it('renders nested route content through Outlet', () => {
    renderMainLayout()

    expect(screen.getByRole('heading', { name: 'Nested route content' })).toBeInTheDocument()
  })
})
