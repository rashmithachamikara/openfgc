import type {
  ConsentApprovalSelection,
  ConsentDetailAPI,
  ConsentListQueryParams,
  ConsentSearchResponse,
} from '../../../types/consent'
import { apiRequest } from '../../../utils/apiClient'

export async function fetchMyConsents(
  params: ConsentListQueryParams,
): Promise<ConsentSearchResponse> {
  return apiRequest<ConsentSearchResponse>('/me/consents', {
    method: 'GET',
    query: {
      consentStatuses: params.consentStatuses,
      consentTypes: params.consentTypes,
      fromTime: params.fromTime,
      toTime: params.toTime,
      limit: params.limit,
      offset: params.offset,
    },
  })
}

export async function fetchMyConsentByID(consentID: string): Promise<ConsentDetailAPI> {
  return apiRequest<ConsentDetailAPI>(`/me/consents/${consentID}`, {
    method: 'GET',
  })
}

export async function approveMyConsent(
  consentID: string,
  selectedOptionalElements: ConsentApprovalSelection[],
): Promise<unknown> {
  return apiRequest<unknown>(`/me/consents/${consentID}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(selectedOptionalElements),
  })
}

export async function revokeMyConsent(consentID: string): Promise<unknown> {
  return apiRequest<unknown>(`/me/consents/${consentID}/revoke`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}
