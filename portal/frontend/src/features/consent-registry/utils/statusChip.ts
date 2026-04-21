import type { ConsentAPIStatus, ConsentStatus } from '../../../types/consent'

type ConsentStatusLike = ConsentAPIStatus | ConsentStatus | string
type ConsentStatusLabelScope = 'consent' | 'authorization'

type ConsentChipColor = 'success' | 'warning' | 'error' | 'default'

export function getConsentStatusChipColor(status: ConsentStatusLike): ConsentChipColor {
  switch (status) {
    case 'ACTIVE':
    case 'Active':
    case 'APPROVED':
      return 'success'
    case 'CREATED':
    case 'Pending':
      return 'warning'
    case 'REJECTED':
    case 'REVOKED':
    case 'Revoked':
      return 'error'
    case 'EXPIRED':
    case 'Expired':
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
  switch (scope) {
    case 'authorization':
      switch (status) {
        case 'APPROVED':
        case 'Active':
        case 'ACTIVE':
          return 'approved'
        case 'CREATED':
        case 'Pending':
          return 'pending'
        case 'REJECTED':
          return 'rejected'
        case 'REVOKED':
        case 'Revoked':
          return 'revoked'
        case 'EXPIRED':
        case 'Expired':
          return 'expired'
        case 'SYS_EXPIRED':
          return 'systemExpired'
        case 'SYS_REVOKED':
          return 'systemRevoked'
        default:
          return status.toLowerCase()
      }
    case 'consent':
    default:
      switch (status) {
        case 'ACTIVE':
        case 'Active':
        case 'APPROVED':
          return 'active'
        case 'CREATED':
        case 'Pending':
          return 'pending'
        case 'REJECTED':
          return 'rejected'
        case 'REVOKED':
        case 'Revoked':
          return 'revoked'
        case 'EXPIRED':
        case 'Expired':
          return 'expired'
        default:
          return status.toLowerCase()
      }
  }
}
