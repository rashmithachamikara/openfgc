import { Box, Stack, Typography } from '@wso2/oxygen-ui'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ConsentRegistryFilters from './components/ConsentRegistryFilters'
import ConsentRegistryTable from './components/ConsentRegistryTable'
import { CONSENT_REGISTRY_MOCK_DATA } from './data/consents'
import type {
  ConsentRegistryFilters as ConsentRegistryFiltersModel,
  ConsentRecord,
} from '../../types/consent'

const DEFAULT_FILTERS: ConsentRegistryFiltersModel = {
  status: 'All',
  startDate: '',
  endDate: '',
  consentType: '',
}

function isWithinDateRange(record: ConsentRecord, startDate: string, endDate: string): boolean {
  const createdAtDate = new Date(record.createdAt)

  if (startDate) {
    const normalizedStartDate = new Date(`${startDate}T00:00:00`)

    if (createdAtDate < normalizedStartDate) {
      return false
    }
  }

  if (endDate) {
    const normalizedEndDate = new Date(`${endDate}T23:59:59`)

    if (createdAtDate > normalizedEndDate) {
      return false
    }
  }

  return true
}

function ConsentRegistryPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const [filters, setFilters] = useState<ConsentRegistryFiltersModel>(DEFAULT_FILTERS)

  const filteredRows = useMemo(() => {
    return CONSENT_REGISTRY_MOCK_DATA.filter((record) => {
      const statusMatch = filters.status === 'All' || record.status === filters.status
      const typeMatch = record.type.toLowerCase().includes(filters.consentType.trim().toLowerCase())
      const dateRangeMatch = isWithinDateRange(record, filters.startDate, filters.endDate)

      return statusMatch && typeMatch && dateRangeMatch
    })
  }, [filters])

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="h4" fontWeight={700}>
            {t('consentRegistry.title')}
          </Typography>
        </Stack>

        <ConsentRegistryFilters
          filters={filters}
          onFilterChange={setFilters}
          onClear={() => {
            setFilters(DEFAULT_FILTERS)
          }}
        />

        <ConsentRegistryTable rows={filteredRows} />
      </Stack>
    </Box>
  )
}

export default ConsentRegistryPage
