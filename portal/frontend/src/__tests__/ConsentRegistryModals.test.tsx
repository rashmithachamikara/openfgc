import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { OxygenTheme, OxygenUIThemeProvider } from '@wso2/oxygen-ui'
import i18n from '../i18n/i18n'
import ConsentApprovalDialog from '../features/consent-registry/components/ConsentApprovalDialog'
import ConsentRevocationDialog from '../features/consent-registry/components/ConsentRevocationDialog'

function renderWithProviders(component: React.JSX.Element): void {
  render(
    <I18nextProvider i18n={i18n}>
      <OxygenUIThemeProvider theme={OxygenTheme}>{component}</OxygenUIThemeProvider>
    </I18nextProvider>,
  )
}

describe('consent registry dialogs', () => {
  it('submits selected optional permissions from approval dialog', () => {
    const onConfirm = vi.fn()

    renderWithProviders(
      <ConsentApprovalDialog
        open
        consentId="consent-123"
        loading={false}
        purposes={[
          {
            name: 'Accounts',
            elements: [
              { name: 'Account Number', isUserApproved: true, isMandatory: true },
              { name: 'Transaction History', isUserApproved: true, isMandatory: false },
              { name: 'Marketing Messages', isUserApproved: false, isMandatory: false },
            ],
          },
        ]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    const toggles = screen.getAllByRole('checkbox', { name: /toggle permission/i })
    fireEvent.click(toggles[1])

    fireEvent.click(screen.getByRole('button', { name: /approve & continue/i }))

    expect(onConfirm).toHaveBeenCalledWith([
      { purposeName: 'Accounts', elementName: 'Transaction History' },
      { purposeName: 'Accounts', elementName: 'Marketing Messages' },
    ])
  })

  it('calls revocation handlers from confirmation dialog', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()

    renderWithProviders(
      <ConsentRevocationDialog
        open
        consentId="consent-456"
        loading={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /revoke all data/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /keep permissions/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
