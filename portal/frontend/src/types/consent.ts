export type ConsentStatus = 'Active' | 'Pending' | 'Rejected' | 'Revoked' | 'Expired'

export type ConsentAPIStatus = 'CREATED' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED'

export interface ConsentRecord {
  id: string
  clientName: string
  type: string
  status: string
  purposes: string[]
  updatedAt: string
  expirationTime?: number
  canRevoke: boolean
  canApprove: boolean
}

export interface ConsentRegistryFilters {
  status: 'All' | ConsentStatus
  startDate: string
  endDate: string
  consentType: string
}

export interface ConsentListQueryParams {
  consentStatuses?: string
  consentTypes?: string
  fromTime?: number
  toTime?: number
  limit: number
  offset: number
}

export interface ConsentElementApprovalItem {
  name: string
  isUserApproved: boolean
  isMandatory?: boolean
  type?: string
  description?: string
  properties?: Record<string, string>
}

export interface ConsentApprovalSelection {
  purposeName: string
  elementName: string
}

export interface ConsentPurposeItem {
  name: string
  elements: ConsentElementApprovalItem[]
}

export interface ConsentAuthorizationResource {
  id: string
  userId?: string
  type: string
  status: string
  updatedTime: number
  resources?: unknown
}

export interface ConsentDetailAPI {
  id: string
  clientId: string
  type: string
  status: ConsentAPIStatus | string
  createdTime: number
  updatedTime: number
  validityTime?: number
  recurringIndicator?: boolean
  frequency?: number
  dataAccessValidityDuration?: number
  purposes: ConsentPurposeItem[]
  authorizations?: ConsentAuthorizationResource[]
}

export interface ConsentSearchMetadata {
  total: number
  offset: number
  count: number
  limit: number
}

export interface ConsentSearchResponse {
  data: ConsentDetailAPI[]
  metadata: ConsentSearchMetadata
}
