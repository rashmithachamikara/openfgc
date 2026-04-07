import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  approveMyConsent,
  fetchMyConsentByID,
  fetchMyConsents,
  revokeMyConsent,
} from '../api/consentsApi'
import type {
  ConsentAPIStatus,
  ConsentDetailAPI,
  ConsentListQueryParams,
  ConsentRecord,
  ConsentRegistryFilters,
} from '../../../types/consent'

interface ConsentListResult {
  rows: ConsentRecord[]
  total: number
}

function toUnixStartOfDay(dateText: string): number | undefined {
  if (!dateText) {
    return undefined
  }

  return Math.floor(new Date(`${dateText}T00:00:00`).getTime() / 1000)
}

function toUnixEndOfDay(dateText: string): number | undefined {
  if (!dateText) {
    return undefined
  }

  return Math.floor(new Date(`${dateText}T23:59:59`).getTime() / 1000)
}

function mapStatus(status: ConsentAPIStatus | string): ConsentRecord['status'] {
  if (status === 'ACTIVE') {
    return 'Active'
  }

  if (status === 'CREATED') {
    return 'Pending'
  }

  if (status === 'REVOKED') {
    return 'Revoked'
  }

  if (status === 'EXPIRED') {
    return 'Expired'
  }

  return 'Pending'
}

function toListParams(
  filters: ConsentRegistryFilters,
  page: number,
  rowsPerPage: number,
): ConsentListQueryParams {
  return {
    consentStatuses:
      filters.status === 'All'
        ? undefined
        : {
            Active: 'ACTIVE',
            Pending: 'CREATED',
            Revoked: 'REVOKED',
            Expired: 'EXPIRED',
          }[filters.status],
    consentTypes: filters.consentType.trim() || undefined,
    fromTime: toUnixStartOfDay(filters.startDate),
    toTime: toUnixEndOfDay(filters.endDate),
    limit: rowsPerPage,
    offset: page * rowsPerPage,
  }
}

function toConsentRow(consent: ConsentDetailAPI): ConsentRecord {
  const mappedStatus = mapStatus(consent.status)

  return {
    id: consent.id,
    clientName: consent.clientId,
    type: consent.type,
    status: mappedStatus,
    purposes: consent.purposes.map((purpose) => purpose.name),
    createdAt: new Date(consent.createdTime * 1000).toISOString(),
    canRevoke: mappedStatus === 'Active',
    canApprove: mappedStatus === 'Pending',
  }
}

export function useConsentListQuery(
  filters: ConsentRegistryFilters,
  page: number,
  rowsPerPage: number,
): UseQueryResult<ConsentListResult> {
  const params = toListParams(filters, page, rowsPerPage)

  return useQuery<ConsentListResult>({
    queryKey: ['consents', params],
    queryFn: async (): Promise<ConsentListResult> => {
      const response = await fetchMyConsents(params)
      return {
        rows: response.data.map(toConsentRow),
        total: response.metadata.total,
      }
    },
  })
}

export function useConsentDetailQuery(
  consentID: string | undefined,
): UseQueryResult<ConsentDetailAPI> {
  return useQuery<ConsentDetailAPI>({
    queryKey: ['consent', consentID],
    queryFn: async (): Promise<ConsentDetailAPI> => fetchMyConsentByID(String(consentID)),
    enabled: Boolean(consentID),
  })
}

export function useApproveConsentMutation(): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (consentID: string): Promise<unknown> => approveMyConsent(consentID),
    onSuccess: async (_data, consentID): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['consents'] })
      await queryClient.invalidateQueries({ queryKey: ['consent', consentID] })
    },
  })
}

export function useRevokeConsentMutation(): UseMutationResult<unknown, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (consentID: string): Promise<unknown> => revokeMyConsent(consentID),
    onSuccess: async (_data, consentID): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['consents'] })
      await queryClient.invalidateQueries({ queryKey: ['consent', consentID] })
    },
  })
}
