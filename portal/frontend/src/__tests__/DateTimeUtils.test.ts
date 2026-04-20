import { describe, expect, it } from 'vitest'
import { formatEpochSeconds, formatIsoDateTime } from '../utils/dateTime'

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
}

describe('formatEpochSeconds', () => {
  it('returns placeholder for undefined, null, and non-finite values', () => {
    expect(formatEpochSeconds(undefined)).toBe('-')
    expect(formatEpochSeconds(null)).toBe('-')
    expect(formatEpochSeconds(Number.NaN)).toBe('-')
    expect(formatEpochSeconds(Number.POSITIVE_INFINITY)).toBe('-')
  })

  it('formats epoch zero as a valid date instead of placeholder', () => {
    const expected = new Date(0).toLocaleString('en-US', DATE_TIME_FORMAT_OPTIONS)

    expect(formatEpochSeconds(0, DATE_TIME_FORMAT_OPTIONS, 'en-US')).toBe(expected)
  })

  it('formats a valid epoch value using locale and options', () => {
    const epochInSeconds = 1710000000
    const expected = new Date(epochInSeconds * 1000).toLocaleString(
      'en-US',
      DATE_TIME_FORMAT_OPTIONS,
    )

    expect(formatEpochSeconds(epochInSeconds, DATE_TIME_FORMAT_OPTIONS, 'en-US')).toBe(expected)
  })
})

describe('formatIsoDateTime', () => {
  it('returns placeholder for empty or invalid values', () => {
    expect(formatIsoDateTime(undefined)).toBe('-')
    expect(formatIsoDateTime(null)).toBe('-')
    expect(formatIsoDateTime('')).toBe('-')
    expect(formatIsoDateTime('not-a-date')).toBe('-')
  })

  it('formats valid ISO date-time using locale and options', () => {
    const isoDateTime = '2026-03-02T15:29:57Z'
    const expected = new Date(isoDateTime).toLocaleString('en-US', DATE_TIME_FORMAT_OPTIONS)

    expect(formatIsoDateTime(isoDateTime, DATE_TIME_FORMAT_OPTIONS, 'en-US')).toBe(expected)
  })
})
