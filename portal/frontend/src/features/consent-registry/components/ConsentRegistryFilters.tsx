import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@wso2/oxygen-ui'
import { useTranslation } from 'react-i18next'
import type { ConsentRegistryFilters as ConsentRegistryFiltersModel } from '../../../types/consent'

interface ConsentRegistryFiltersProps {
  filters: ConsentRegistryFiltersModel
  onFilterChange: (nextFilters: ConsentRegistryFiltersModel) => void
  onClear: () => void
}

function ConsentRegistryFilters({
  filters,
  onFilterChange,
  onClear,
}: ConsentRegistryFiltersProps): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Box
      component="section"
      aria-label={t('consentRegistry.filters.sectionAriaLabel')}
      sx={{
        p: 2,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="consent-status-label">{t('consentRegistry.filters.status')}</InputLabel>
          <Select
            labelId="consent-status-label"
            id="consent-status"
            value={filters.status}
            label={t('consentRegistry.filters.status')}
            onChange={(event) => {
              onFilterChange({
                ...filters,
                status: event.target.value as ConsentRegistryFiltersModel['status'],
              })
            }}
          >
            <MenuItem value="All">{t('consentRegistry.status.all')}</MenuItem>
            <MenuItem value="Active">{t('consentRegistry.status.active')}</MenuItem>
            <MenuItem value="Pending">{t('consentRegistry.status.pending')}</MenuItem>
            <MenuItem value="Revoked">{t('consentRegistry.status.revoked')}</MenuItem>
            <MenuItem value="Expired">{t('consentRegistry.status.expired')}</MenuItem>
          </Select>
        </FormControl>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ width: { xs: '100%', lg: 'auto' } }}
        >
          <TextField
            label={t('consentRegistry.filters.startDate')}
            type="date"
            size="small"
            value={filters.startDate}
            onChange={(event) => {
              onFilterChange({
                ...filters,
                startDate: event.target.value,
              })
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('consentRegistry.filters.endDate')}
            type="date"
            size="small"
            value={filters.endDate}
            onChange={(event) => {
              onFilterChange({
                ...filters,
                endDate: event.target.value,
              })
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <TextField
          label={t('consentRegistry.filters.consentType')}
          size="small"
          value={filters.consentType}
          onChange={(event) => {
            onFilterChange({
              ...filters,
              consentType: event.target.value,
            })
          }}
          sx={{ flex: 1, minWidth: 180 }}
        />

        <Button variant="text" onClick={onClear}>
          {t('consentRegistry.filters.clear')}
        </Button>
      </Stack>
    </Box>
  )
}

export default ConsentRegistryFilters
