/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Box, Stack, Typography } from '@wso2/oxygen-ui'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import ConsentApprovalDialog from './components/ConsentApprovalDialog'
import ConsentRegistryFilters from './components/ConsentRegistryFilters'
import ConsentRegistryTable from './components/ConsentRegistryTable'
import ConsentRevocationDialog from './components/ConsentRevocationDialog'
import type { ConsentRegistryFilters as ConsentRegistryFiltersModel } from '../../types/consent'
import {
  useApproveConsentMutation,
  useConsentDetailQuery,
  useConsentListQuery,
  useRevokeConsentMutation,
} from './hooks/useConsentQueries'

const DEFAULT_FILTERS: ConsentRegistryFiltersModel = {
  status: 'All',
  startDate: '',
  endDate: '',
  consentType: '',
}

const FILTER_STATUS_VALUES: ConsentRegistryFiltersModel['status'][] = [
  'All',
  'Active',
  'Pending',
  'Rejected',
  'Revoked',
  'Expired',
]

const TABLE_SKELETON_DEBOUNCE_MS = 50

function isValidFilterStatus(value: string): value is ConsentRegistryFiltersModel['status'] {
  return FILTER_STATUS_VALUES.includes(value as ConsentRegistryFiltersModel['status'])
}

function getFiltersFromSearchParams(searchParams: URLSearchParams): ConsentRegistryFiltersModel {
  const statusParam = searchParams.get('status')

  return {
    status: statusParam && isValidFilterStatus(statusParam) ? statusParam : DEFAULT_FILTERS.status,
    startDate: searchParams.get('startDate') ?? DEFAULT_FILTERS.startDate,
    endDate: searchParams.get('endDate') ?? DEFAULT_FILTERS.endDate,
    consentType: searchParams.get('consentType') ?? DEFAULT_FILTERS.consentType,
  }
}

function toSearchParams(filters: ConsentRegistryFiltersModel): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.status !== DEFAULT_FILTERS.status) {
    params.set('status', filters.status)
  }

  if (filters.startDate) {
    params.set('startDate', filters.startDate)
  }

  if (filters.endDate) {
    params.set('endDate', filters.endDate)
  }

  if (filters.consentType.trim()) {
    params.set('consentType', filters.consentType.trim())
  }

  return params
}

function ConsentRegistryPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState<boolean>(false)
  const [revocationDialogOpen, setRevocationDialogOpen] = useState<boolean>(false)
  const [selectedApprovalConsentID, setSelectedApprovalConsentID] = useState<string | null>(null)
  const [selectedRevocationConsentID, setSelectedRevocationConsentID] = useState<string | null>(
    null,
  )
  const [showTableSkeleton, setShowTableSkeleton] = useState<boolean>(false)

  const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParams])
  const consentListQuery = useConsentListQuery(filters, page, rowsPerPage)
  const selectedApprovalConsentQuery = useConsentDetailQuery(selectedApprovalConsentID ?? undefined)
  const approveMutation = useApproveConsentMutation()
  const revokeMutation = useRevokeConsentMutation()
  const isTableFetching = consentListQuery.isFetching

  const rows = consentListQuery.data?.rows ?? []
  const totalCount = consentListQuery.data?.total ?? 0

  useEffect(() => {
    let debounceDelay = 0

    if (!consentListQuery.isLoading && isTableFetching) {
      debounceDelay = TABLE_SKELETON_DEBOUNCE_MS
    }

    const skeletonTimer = window.setTimeout(() => {
      setShowTableSkeleton(isTableFetching)
    }, debounceDelay)

    return () => {
      window.clearTimeout(skeletonTimer)
    }
  }, [consentListQuery.isLoading, isTableFetching])

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <HeaderBreadcrumbs />
          <Typography variant="h4" fontWeight={700}>
            {t('consentRegistry.title')}
          </Typography>
        </Stack>

        <ConsentRegistryFilters
          filters={filters}
          onFilterChange={(nextFilters) => {
            setPage(0)
            setSearchParams(toSearchParams(nextFilters), { replace: true })
          }}
          onClear={() => {
            setPage(0)
            setSearchParams({}, { replace: true })
          }}
        />

        {consentListQuery.isError ? (
          <Typography color="error.main">{t('consentRegistry.messages.loadFailed')}</Typography>
        ) : null}

        {!consentListQuery.isError && (rows.length > 0 || isTableFetching) ? (
          <ConsentRegistryTable
            rows={rows}
            totalCount={totalCount}
            isLoading={isTableFetching && showTableSkeleton}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(nextRowsPerPage) => {
              setRowsPerPage(nextRowsPerPage)
              setPage(0)
            }}
            onApprove={(consentID) => {
              setSelectedApprovalConsentID(consentID)
              setApprovalDialogOpen(true)
            }}
            onRevoke={(consentID) => {
              setSelectedRevocationConsentID(consentID)
              setRevocationDialogOpen(true)
            }}
            isMutating={approveMutation.isPending || revokeMutation.isPending}
          />
        ) : null}

        {!isTableFetching && !consentListQuery.isError && rows.length === 0 ? (
          <Typography>{t('consentRegistry.messages.empty')}</Typography>
        ) : null}

        {selectedApprovalConsentID ? (
          <ConsentApprovalDialog
            key={`registry-approval-${selectedApprovalConsentID}-${String(approvalDialogOpen)}`}
            open={approvalDialogOpen}
            consentId={selectedApprovalConsentID}
            purposes={selectedApprovalConsentQuery.data?.purposes ?? []}
            loading={
              approveMutation.isPending ||
              selectedApprovalConsentQuery.isLoading ||
              !selectedApprovalConsentQuery.data
            }
            onClose={() => {
              setApprovalDialogOpen(false)
              setSelectedApprovalConsentID(null)
            }}
            onConfirm={(selectedOptionalElements) => {
              approveMutation.mutate(
                {
                  consentID: selectedApprovalConsentID,
                  selectedOptionalElements,
                },
                {
                  onSuccess: () => {
                    setApprovalDialogOpen(false)
                    setSelectedApprovalConsentID(null)
                  },
                },
              )
            }}
          />
        ) : null}

        {selectedRevocationConsentID ? (
          <ConsentRevocationDialog
            key={`registry-revocation-${selectedRevocationConsentID}-${String(revocationDialogOpen)}`}
            open={revocationDialogOpen}
            consentId={selectedRevocationConsentID}
            loading={revokeMutation.isPending}
            onClose={() => {
              setRevocationDialogOpen(false)
              setSelectedRevocationConsentID(null)
            }}
            onConfirm={() => {
              revokeMutation.mutate(selectedRevocationConsentID, {
                onSuccess: () => {
                  setRevocationDialogOpen(false)
                  setSelectedRevocationConsentID(null)
                },
              })
            }}
          />
        ) : null}
      </Stack>
    </Box>
  )
}

export default ConsentRegistryPage
