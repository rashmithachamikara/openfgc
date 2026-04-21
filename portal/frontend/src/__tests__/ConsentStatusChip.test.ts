import { describe, expect, it } from 'vitest'
import {
  getConsentStatusChipColor,
  getConsentStatusLabelKey,
} from '../features/consent-registry/utils/statusChip'

describe('getConsentStatusChipColor', () => {
  it('maps API and display statuses to the expected chip colors', () => {
    expect(getConsentStatusChipColor('ACTIVE')).toBe('success')
    expect(getConsentStatusChipColor('Active')).toBe('success')
    expect(getConsentStatusChipColor('APPROVED')).toBe('success')
    expect(getConsentStatusChipColor('CREATED')).toBe('warning')
    expect(getConsentStatusChipColor('Pending')).toBe('warning')
    expect(getConsentStatusChipColor('REJECTED')).toBe('error')
    expect(getConsentStatusChipColor('REVOKED')).toBe('error')
    expect(getConsentStatusChipColor('Revoked')).toBe('error')
    expect(getConsentStatusChipColor('EXPIRED')).toBe('default')
    expect(getConsentStatusChipColor('Expired')).toBe('default')
    expect(getConsentStatusChipColor('SYS_EXPIRED')).toBe('default')
    expect(getConsentStatusChipColor('SYS_REVOKED')).toBe('default')
  })

  it('maps statuses to the expected translation keys', () => {
    expect(getConsentStatusLabelKey('ACTIVE')).toBe('active')
    expect(getConsentStatusLabelKey('CREATED')).toBe('pending')
    expect(getConsentStatusLabelKey('REJECTED')).toBe('rejected')
    expect(getConsentStatusLabelKey('REVOKED')).toBe('revoked')
    expect(getConsentStatusLabelKey('EXPIRED')).toBe('expired')
    expect(getConsentStatusLabelKey('APPROVED', 'authorization')).toBe('approved')
    expect(getConsentStatusLabelKey('CREATED', 'authorization')).toBe('pending')
    expect(getConsentStatusLabelKey('SYS_EXPIRED', 'authorization')).toBe('systemExpired')
    expect(getConsentStatusLabelKey('SYS_REVOKED', 'authorization')).toBe('systemRevoked')
  })
})
