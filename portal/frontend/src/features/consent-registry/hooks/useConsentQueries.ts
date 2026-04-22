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
import {
  isConsentApprovableStatus,
  isConsentRevokableStatus,
  normalizeConsentStatus,
} from '../utils/statusChip'
import type {
  ConsentApprovalSelection,
  ConsentDetailAPI,
  ConsentListQueryParams,
  ConsentRecord,
  ConsentRegistryFilters,
} from '../../../types/consent'

interface ConsentListResult {
  rows: ConsentRecord[]
  total: number
}

interface ApproveConsentVariables {
  consentID: string
  selectedOptionalElements: ConsentApprovalSelection[]
}

function toUnixStartOfDay(dateText: string): number | undefined {
  if (!dateText) {
    return undefined
  }

  const unixMilliseconds = new Date(`${dateText}T00:00:00`).getTime()

  if (Number.isNaN(unixMilliseconds)) {
    return undefined
  }

  return Math.floor(unixMilliseconds / 1000)
}

function toUnixEndOfDay(dateText: string): number | undefined {
  if (!dateText) {
    return undefined
  }

  const unixMilliseconds = new Date(`${dateText}T23:59:59`).getTime()

  if (Number.isNaN(unixMilliseconds)) {
    return undefined
  }

  return Math.floor(unixMilliseconds / 1000)
}

function toListParams(
  filters: ConsentRegistryFilters,
  page: number,
  rowsPerPage: number,
): ConsentListQueryParams {
  const statusFilterMap: Record<Exclude<ConsentRegistryFilters['status'], 'All'>, string> = {
    Active: 'ACTIVE',
    Pending: 'CREATED,PENDING',
    Rejected: 'REJECTED',
    Revoked: 'REVOKED',
    Expired: 'EXPIRED',
  }

  return {
    consentStatuses: filters.status === 'All' ? undefined : statusFilterMap[filters.status],
    consentTypes: filters.consentType.trim() || undefined,
    fromTime: toUnixStartOfDay(filters.startDate),
    toTime: toUnixEndOfDay(filters.endDate),
    limit: rowsPerPage,
    offset: page * rowsPerPage,
  }
}

function toConsentRow(consent: ConsentDetailAPI): ConsentRecord {
  const normalizedStatus = normalizeConsentStatus(consent.status)

  return {
    id: consent.id,
    clientName: consent.clientId,
    type: consent.type,
    status: normalizedStatus,
    purposes: consent.purposes.map((purpose) => purpose.name),
    updatedAt: new Date(consent.updatedTime * 1000).toISOString(),
    expirationTime: consent.validityTime,
    canRevoke: isConsentRevokableStatus(normalizedStatus),
    canApprove: isConsentApprovableStatus(normalizedStatus),
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

export function useApproveConsentMutation(): UseMutationResult<
  unknown,
  Error,
  ApproveConsentVariables
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      consentID,
      selectedOptionalElements,
    }: ApproveConsentVariables): Promise<unknown> =>
      approveMyConsent(consentID, selectedOptionalElements),
    onSuccess: async (_data, variables): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['consents'] })
      await queryClient.invalidateQueries({ queryKey: ['consent', variables.consentID] })
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
