/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AcrylicOrangeTheme, OxygenUIThemeProvider } from '@wso2/oxygen-ui'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserProfileMenu from '../components/layout/main-layout/UserProfileMenu'
import i18n from '../i18n/i18n'

const authMocks = vi.hoisted(() => ({
  getUserProfile: vi.fn<() => Record<string, unknown> | undefined>(),
  logout: vi.fn<() => Promise<void>>(),
}))

vi.mock('../utils/authClient', () => authMocks)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderMenu(profile?: Record<string, unknown>): void {
  authMocks.getUserProfile.mockReturnValue(profile)
  authMocks.logout.mockResolvedValue()
  render(
    <OxygenUIThemeProvider theme={AcrylicOrangeTheme}>
      <I18nextProvider i18n={i18n}>
        <UserProfileMenu />
      </I18nextProvider>
    </OxygenUIThemeProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
}

describe('UserProfileMenu', () => {
  it.each([
    [{ name: 'Name', displayName: 'Display Name' }, 'Name'],
    [{ displayName: 'Display Name' }, 'Display Name'],
    [{ given_name: 'Ada', family_name: 'Lovelace' }, 'Ada Lovelace'],
    [{ preferred_username: 'preferred', username: 'username' }, 'preferred'],
    [{ username: 'username' }, 'username'],
  ])('resolves the display name from claims in priority order', (profile, expectedName) => {
    renderMenu(profile)

    expect(screen.getByText(expectedName)).toBeInTheDocument()
  })

  it('uses email and avatar claims', () => {
    renderMenu({
      name: 'Portal User',
      email: 'user@example.com',
      picture: 'https://example.com/u.png',
    })

    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Portal User' })).toHaveAttribute(
      'src',
      'https://example.com/u.png',
    )
  })

  it('falls back to subject when email is unavailable', () => {
    renderMenu({ name: 'Portal User', sub: 'user-1' })

    expect(screen.getByText('user-1')).toBeInTheDocument()
  })

  it('shows translated fallbacks when profile claims are unavailable', () => {
    renderMenu()

    expect(screen.getByText('Unknown user')).toBeInTheDocument()
    expect(screen.getByText('No email available')).toBeInTheDocument()
  })

  it('invokes logout and consumes a rejected logout promise', async () => {
    renderMenu({ name: 'Portal User', email: 'user@example.com' })
    authMocks.logout.mockRejectedValueOnce(new Error('logout failed'))

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    await waitFor(() => {
      expect(authMocks.logout).toHaveBeenCalledOnce()
    })
  })
})
