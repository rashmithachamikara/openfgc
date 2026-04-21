import type { ConsentAPIStatus, ConsentStatus } from '../../../types/consent'

type ConsentStatusLike = ConsentAPIStatus | ConsentStatus | string

type ConsentChipColor = 'success' | 'warning' | 'error' | 'default'

export function getConsentStatusChipColor(status: ConsentStatusLike): ConsentChipColor {
  switch (status) {
    case 'ACTIVE':
    case 'Active':
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
      return 'default'
    default:
      return 'default'
  }
}
