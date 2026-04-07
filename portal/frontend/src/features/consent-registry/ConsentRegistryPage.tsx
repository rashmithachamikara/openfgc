import { Box, Stack, Typography } from '@wso2/oxygen-ui'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import ConsentRegistryFilters from './components/ConsentRegistryFilters'
import ConsentRegistryTable from './components/ConsentRegistryTable'
import type { ConsentRegistryFilters as ConsentRegistryFiltersModel } from '../../types/consent'
import {
  useApproveConsentMutation,
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
  'Revoked',
  'Expired',
]

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

  const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParams])
  const consentListQuery = useConsentListQuery(filters, page, rowsPerPage)
  const approveMutation = useApproveConsentMutation()
  const revokeMutation = useRevokeConsentMutation()

  const rows = consentListQuery.data?.rows ?? []
  const totalCount = consentListQuery.data?.total ?? 0

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

        {consentListQuery.isLoading ? (
          <Typography>{t('consentRegistry.messages.loading')}</Typography>
        ) : null}

        {!consentListQuery.isLoading && !consentListQuery.isError ? (
          <ConsentRegistryTable
            rows={rows}
            totalCount={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(nextRowsPerPage) => {
              setRowsPerPage(nextRowsPerPage)
              setPage(0)
            }}
            onApprove={(consentID) => {
              approveMutation.mutate(consentID)
            }}
            onRevoke={(consentID) => {
              revokeMutation.mutate(consentID)
            }}
            isMutating={approveMutation.isPending || revokeMutation.isPending}
          />
        ) : null}

        {!consentListQuery.isLoading && !consentListQuery.isError && rows.length === 0 ? (
          <Typography>{t('consentRegistry.messages.empty')}</Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

export default ConsentRegistryPage
