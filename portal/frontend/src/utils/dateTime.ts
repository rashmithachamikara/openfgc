const EMPTY_DATE_PLACEHOLDER = '-'

export function formatEpochSeconds(
  epochInSeconds: number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
): string {
  if (epochInSeconds == null || !Number.isFinite(epochInSeconds)) {
    return EMPTY_DATE_PLACEHOLDER
  }

  return new Date(epochInSeconds * 1000).toLocaleString(locales, options)
}

export function formatIsoDateTime(
  dateTimeText: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
): string {
  if (!dateTimeText) {
    return EMPTY_DATE_PLACEHOLDER
  }

  const parsedDate = new Date(dateTimeText)

  if (Number.isNaN(parsedDate.getTime())) {
    return EMPTY_DATE_PLACEHOLDER
  }

  return parsedDate.toLocaleString(locales, options)
}
