import { describe, expect, it } from 'vitest'
import { getConsentStatusChipColor } from '../features/consent-registry/utils/statusChip'

describe('getConsentStatusChipColor', () => {
  it('maps API and display statuses to the expected chip colors', () => {
    expect(getConsentStatusChipColor('ACTIVE')).toBe('success')
    expect(getConsentStatusChipColor('Active')).toBe('success')
    expect(getConsentStatusChipColor('CREATED')).toBe('warning')
    expect(getConsentStatusChipColor('Pending')).toBe('warning')
    expect(getConsentStatusChipColor('REJECTED')).toBe('error')
    expect(getConsentStatusChipColor('REVOKED')).toBe('error')
    expect(getConsentStatusChipColor('Revoked')).toBe('error')
    expect(getConsentStatusChipColor('EXPIRED')).toBe('default')
    expect(getConsentStatusChipColor('Expired')).toBe('default')
  })
})
