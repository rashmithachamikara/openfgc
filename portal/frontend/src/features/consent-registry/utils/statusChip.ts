import type { ConsentAPIStatus, ConsentStatus } from '../../../types/consent'

type ConsentStatusLike = ConsentAPIStatus | ConsentStatus | string
type ConsentStatusLabelScope = 'consent' | 'authorization'

type ConsentChipColor = 'success' | 'warning' | 'error' | 'default'

export function normalizeConsentStatus(status: ConsentStatusLike): string {
  return status.trim().toUpperCase()
}

export function isConsentApprovableStatus(status: ConsentStatusLike): boolean {
  return normalizeConsentStatus(status) === 'CREATED'
}

export function isConsentRevokableStatus(status: ConsentStatusLike): boolean {
  return normalizeConsentStatus(status) === 'ACTIVE'
}

export function getConsentStatusChipColor(status: ConsentStatusLike): ConsentChipColor {
  switch (normalizeConsentStatus(status)) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'success'
    case 'CREATED':
    case 'PENDING':
      return 'warning'
    case 'REJECTED':
    case 'REVOKED':
      return 'error'
    case 'EXPIRED':
    case 'SYS_EXPIRED':
    case 'SYS_REVOKED':
      return 'default'
    default:
      return 'default'
  }
}

export function getConsentStatusLabelKey(
  status: ConsentStatusLike,
  scope: ConsentStatusLabelScope = 'consent',
): string {
  const normalizedStatus = normalizeConsentStatus(status)

  switch (scope) {
    case 'authorization':
      switch (normalizedStatus) {
        case 'APPROVED':
        case 'ACTIVE':
          return 'approved'
        case 'CREATED':
        case 'PENDING':
          return 'pending'
        case 'REJECTED':
          return 'rejected'
        case 'REVOKED':
          return 'revoked'
        case 'EXPIRED':
          return 'expired'
        case 'SYS_EXPIRED':
          return 'systemExpired'
        case 'SYS_REVOKED':
          return 'systemRevoked'
        default:
          return normalizedStatus.toLowerCase()
      }
    case 'consent':
    default:
      switch (normalizedStatus) {
        case 'ACTIVE':
        case 'APPROVED':
          return 'active'
        case 'CREATED':
        case 'PENDING':
          return 'pending'
        case 'REJECTED':
          return 'rejected'
        case 'REVOKED':
          return 'revoked'
        case 'EXPIRED':
          return 'expired'
        default:
          return normalizedStatus.toLowerCase()
      }
  }
}
