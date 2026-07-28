/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Popover,
  SearchBar,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@wso2/oxygen-ui'
import { ListFilter, Plus, Search } from '@wso2/oxygen-ui-icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import type { PurposeFilters } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import PurposeFormDialog from './components/PurposeFormDialog'
import { useCreatePurposeMutation, usePurposesQuery } from './hooks/useCatalogQueries'

const ROW_OPTIONS = [10, 25, 50]
const ORG_ID = String(import.meta.env.VITE_ORG_ID ?? '').trim()

type PurposeScope = 'organization' | 'all'

interface PurposeListFilters extends PurposeFilters {
  scope: PurposeScope
}

function emptyFilters(): PurposeListFilters {
  return {
    purposeName: '',
    purposeVersion: '',
    elementName: '',
    elementNamespace: '',
    elementVersion: '',
    groupIds: ORG_ID,
    scope: 'organization',
  }
}

function getFilters(searchParams: URLSearchParams): PurposeListFilters {
  const scope: PurposeScope = searchParams.get('scope') === 'all' ? 'all' : 'organization'

  return {
    purposeName: searchParams.get('purposeName') ?? '',
    purposeVersion: searchParams.get('purposeVersion') ?? '',
    elementName: searchParams.get('elementName') ?? '',
    elementNamespace: searchParams.get('elementNamespace') ?? '',
    elementVersion: searchParams.get('elementVersion') ?? '',
    groupIds: scope === 'organization' ? ORG_ID : (searchParams.get('groupIds') ?? ''),
    scope,
  }
}

interface PurposeFiltersPanelProps {
  initialFilters: PurposeListFilters
  onApply: (filters: PurposeListFilters) => void
  onClear: () => void
}

function PurposeFiltersPanel({
  initialFilters,
  onApply,
  onClear,
}: PurposeFiltersPanelProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [draft, setDraft] = useState(initialFilters)
  const [filtersAnchor, setFiltersAnchor] = useState<HTMLElement | null>(null)
  const filtersOpen = Boolean(filtersAnchor)
  const advancedFilterCount = [
    draft.purposeVersion,
    draft.elementName,
    draft.elementNamespace,
    draft.elementVersion,
    draft.scope === 'all' ? draft.groupIds : '',
  ].filter(Boolean).length

  const applySearch = (purposeName: string): void => {
    const nextFilters = { ...draft, purposeName }
    setDraft(nextFilters)
    onApply(nextFilters)
  }

  const cancelAdvancedChanges = (): void => {
    setDraft({ ...initialFilters, purposeName: draft.purposeName })
    setFiltersAnchor(null)
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <SearchBar
        size="small"
        fullWidth
        value={draft.purposeName}
        placeholder={t('catalog.purposes.searchPlaceholder')}
        onChange={(event) => {
          const purposeName = event.target.value
          setDraft({
            ...draft,
            purposeName,
            purposeVersion: purposeName.trim() ? draft.purposeVersion : '',
          })
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            applySearch(draft.purposeName)
          }
        }}
        sx={{ '& .MuiInputBase-root': { pr: 6 } }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          right: 4,
          transform: 'translateY(-50%)',
          pl: 0.5,
          borderLeft: 1,
          borderColor: 'divider',
          display: 'flex',
        }}
      >
        <Tooltip title={t('catalog.actions.filters')}>
          <IconButton
            size="small"
            color={filtersOpen ? 'primary' : 'default'}
            aria-label={t('catalog.actions.filters')}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            onClick={(event) => setFiltersAnchor(event.currentTarget)}
          >
            <ListFilter size={17} />
          </IconButton>
        </Tooltip>
        {advancedFilterCount > 0 ? (
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 16,
              height: 16,
              px: 0.4,
              borderRadius: 8,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: '0.625rem',
              lineHeight: '16px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {advancedFilterCount}
          </Box>
        ) : null}
      </Box>

      <Popover
        open={filtersOpen}
        anchorEl={filtersAnchor}
        onClose={cancelAdvancedChanges}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'calc(100vw - 32px)', sm: 620 },
              maxWidth: 'calc(100vw - 32px)',
              mt: 1,
              p: 2.5,
            },
          },
        }}
      >
        <Stack spacing={2.5}>
          <Stack sx={{ pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {t('catalog.purposes.filterTitle')}
            </Typography>
          </Stack>
          <ToggleButtonGroup
            value={draft.scope}
            exclusive
            color="primary"
            fullWidth
            size="small"
            onChange={(_, value: PurposeScope | null) => {
              if (!value) return
              setDraft({
                ...draft,
                scope: value,
                groupIds: value === 'organization' ? ORG_ID : '',
              })
            }}
            aria-label={t('catalog.purposes.scopeFilter')}
          >
            <ToggleButton value="organization">{t('catalog.purposes.orgWide')}</ToggleButton>
            <ToggleButton value="all">{t('catalog.purposes.allPurposes')}</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {draft.scope === 'all' ? (
              <Tooltip arrow title={t('catalog.help.commaSeparatedGroups')}>
                <Box sx={{ width: '100%' }}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t('catalog.fields.groupIds')}
                    value={draft.groupIds}
                    onChange={(event) => setDraft({ ...draft, groupIds: event.target.value })}
                  />
                </Box>
              </Tooltip>
            ) : null}
            <Tooltip
              arrow
              title={t('catalog.help.purposeVersionRequiresName')}
              disableHoverListener={Boolean(draft.purposeName.trim())}
            >
              <Box sx={{ width: '100%' }}>
                <TextField
                  size="small"
                  fullWidth
                  disabled={!draft.purposeName.trim()}
                  label={t('catalog.fields.purposeVersion')}
                  value={draft.purposeVersion}
                  onChange={(event) => setDraft({ ...draft, purposeVersion: event.target.value })}
                />
              </Box>
            </Tooltip>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              fullWidth
              label={t('catalog.fields.elementName')}
              value={draft.elementName}
              onChange={(event) => {
                const elementName = event.target.value
                setDraft({
                  ...draft,
                  elementName,
                  elementVersion:
                    elementName.trim() || draft.elementNamespace.trim() ? draft.elementVersion : '',
                })
              }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('catalog.fields.elementNamespace')}
              value={draft.elementNamespace}
              onChange={(event) => {
                const elementNamespace = event.target.value
                setDraft({
                  ...draft,
                  elementNamespace,
                  elementVersion:
                    draft.elementName.trim() || elementNamespace.trim() ? draft.elementVersion : '',
                })
              }}
            />
            <Tooltip
              arrow
              title={t('catalog.help.elementVersionRequiresIdentity')}
              disableHoverListener={Boolean(
                draft.elementName.trim() || draft.elementNamespace.trim(),
              )}
            >
              <Box sx={{ width: '100%' }}>
                <TextField
                  size="small"
                  fullWidth
                  disabled={!draft.elementName.trim() && !draft.elementNamespace.trim()}
                  label={t('catalog.fields.elementVersion')}
                  value={draft.elementVersion}
                  onChange={(event) => setDraft({ ...draft, elementVersion: event.target.value })}
                />
              </Box>
            </Tooltip>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="space-between"
            sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}
          >
            <Button
              variant="text"
              onClick={() => {
                setDraft(emptyFilters())
                setFiltersAnchor(null)
                onClear()
              }}
            >
              {t('catalog.actions.clearAll')}
            </Button>
            <Stack direction="row" spacing={1}>
              <Button onClick={cancelAdvancedChanges}>{t('catalog.actions.cancel')}</Button>
              <Button
                variant="contained"
                onClick={() => {
                  onApply(draft)
                  setFiltersAnchor(null)
                }}
              >
                {t('catalog.actions.apply')}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Popover>
    </Box>
  )
}

function PurposeListPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const filters = useMemo(() => getFilters(searchParams), [searchParams])
  const parsedPage = Number(searchParams.get('page') ?? '1')
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage - 1 : 0
  const parsedRows = Number(searchParams.get('rowsPerPage') ?? '10')
  const rowsPerPage = ROW_OPTIONS.includes(parsedRows) ? parsedRows : 10
  const query = usePurposesQuery(filters, page, rowsPerPage)
  const createMutation = useCreatePurposeMutation()

  const updateParams = (
    nextFilters: PurposeListFilters,
    nextPage = 0,
    nextRowsPerPage = rowsPerPage,
  ): void => {
    const params = new URLSearchParams()
    const { scope, ...apiFilters } = nextFilters
    Object.entries(apiFilters).forEach(([key, value]) => {
      if (scope === 'organization' && key === 'groupIds') return
      if (value.trim()) params.set(key, value.trim())
    })
    if (scope === 'all') params.set('scope', 'all')
    if (nextPage > 0) params.set('page', String(nextPage + 1))
    if (nextRowsPerPage !== 10) params.set('rowsPerPage', String(nextRowsPerPage))
    setSearchParams(params, { replace: true })
  }

  const rows = query.data?.data ?? []
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) =>
      key !== 'scope' &&
      !(filters.scope === 'organization' && key === 'groupIds') &&
      Boolean(value.trim()),
  ) as Array<[keyof PurposeFilters, string]>
  const filterLabels: Record<keyof PurposeFilters, string> = {
    purposeName: t('catalog.fields.purposeName'),
    purposeVersion: t('catalog.fields.purposeVersion'),
    elementName: t('catalog.fields.elementName'),
    elementNamespace: t('catalog.fields.elementNamespace'),
    elementVersion: t('catalog.fields.elementVersion'),
    groupIds: t('catalog.fields.groupIds'),
  }
  const removeFilter = (key: keyof PurposeFilters): void => {
    const nextFilters: PurposeListFilters = { ...filters, [key]: '' }

    if (key === 'purposeName') nextFilters.purposeVersion = ''
    if (key === 'elementName' && !filters.elementNamespace) nextFilters.elementVersion = ''
    if (key === 'elementNamespace' && !filters.elementName) nextFilters.elementVersion = ''

    updateParams(nextFilters)
  }

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'flex-end' }}
          spacing={2}
        >
          <Stack spacing={1}>
            <HeaderBreadcrumbs />
            <Typography variant="h4" fontWeight={700}>
              {t('catalog.purposes.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('catalog.purposes.subtitle')}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('catalog.purposes.add')}
          </Button>
        </Stack>

        <PurposeFiltersPanel
          key={`purpose-filters-${searchParams.toString()}`}
          initialFilters={filters}
          onApply={(nextFilters) => updateParams(nextFilters)}
          onClear={() => setSearchParams({}, { replace: true })}
        />

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            {t('catalog.purposes.activeFilters')}
          </Typography>
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={
              filters.scope === 'organization'
                ? t('catalog.purposes.orgWide')
                : t('catalog.purposes.allPurposes')
            }
          />
          {activeFilters.map(([key, value]) => (
            <Chip
              key={key}
              size="small"
              variant="outlined"
              label={`${filterLabels[key]}: ${value}`}
              onDelete={() => removeFilter(key)}
            />
          ))}
          {activeFilters.length > 0 || filters.scope === 'all' ? (
            <Button size="small" onClick={() => setSearchParams({}, { replace: true })}>
              {t('catalog.actions.clearAll')}
            </Button>
          ) : null}
        </Stack>

        {query.isError ? (
          <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.main' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography color="error.main">{t('catalog.purposes.loadFailed')}</Typography>
              <Button size="small" onClick={() => query.refetch()}>
                {t('catalog.actions.retry')}
              </Button>
            </Stack>
          </Paper>
        ) : null}

        <TableContainer component={Paper} elevation={1}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              {t('catalog.purposes.results', { count: query.data?.metadata.total ?? 0 })}
            </Typography>
            {query.isFetching && !query.isPending ? (
              <Typography variant="caption" color="text.secondary">
                {t('catalog.purposes.refreshing')}
              </Typography>
            ) : null}
          </Box>
          <Table aria-label={t('catalog.purposes.tableLabel')} sx={{ tableLayout: 'fixed' }}>
            <TableHead
              sx={(theme) => ({
                '& .MuiTableCell-head': {
                  fontWeight: 600,
                  ...theme.applyStyles('light', {
                    backgroundColor: theme.palette.grey[50],
                  }),
                  ...theme.applyStyles('dark', {
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  }),
                },
              })}
            >
              <TableRow>
                <TableCell sx={{ width: '22%' }}>{t('catalog.fields.purpose')}</TableCell>
                <TableCell sx={{ width: '17%' }}>{t('catalog.fields.groupId')}</TableCell>
                <TableCell sx={{ width: '10%' }}>{t('catalog.fields.version')}</TableCell>
                <TableCell sx={{ width: '34%' }}>{t('catalog.fields.description')}</TableCell>
                <TableCell sx={{ width: '17%' }}>{t('catalog.fields.created')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.isPending
                ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`purpose-skeleton-${String(index)}`}>
                      {Array.from({ length: 5 }).map((__, cell) => (
                        <TableCell key={`purpose-skeleton-${String(index)}-${String(cell)}`}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((purpose) => (
                    <TableRow
                      hover
                      key={purpose.purposeId}
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/purposes/${encodeURIComponent(purpose.purposeId)}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          navigate(`/purposes/${encodeURIComponent(purpose.purposeId)}`)
                        }
                      }}
                    >
                      <TableCell>
                        <Stack spacing={0.35}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {purpose.displayName ?? purpose.name}
                          </Typography>
                          <Typography
                            component="code"
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {purpose.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {purpose.groupId === ORG_ID ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t('catalog.purposes.orgWide')}
                          />
                        ) : (
                          <Typography variant="body2" noWrap title={purpose.groupId}>
                            {purpose.groupId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color="primary" label={purpose.version} />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={purpose.description ? 'text.primary' : 'text.secondary'}
                          title={purpose.description}
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {purpose.description ?? t('catalog.values.noDescription')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {formatEpochTimestamp(purpose.createdTime)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              {!query.isPending && !query.isError && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Stack spacing={1} alignItems="center">
                      <Search size={28} aria-hidden="true" />
                      <Typography fontWeight={600}>{t('catalog.purposes.emptyTitle')}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('catalog.purposes.empty')}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={query.data?.metadata.total ?? 0}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROW_OPTIONS}
            onPageChange={(_, nextPage) => updateParams(filters, nextPage)}
            onRowsPerPageChange={(event) => updateParams(filters, 0, Number(event.target.value))}
          />
        </TableContainer>
      </Stack>

      <PurposeFormDialog
        key={`create-purpose-${String(createOpen)}`}
        open={createOpen}
        initialValue={undefined}
        loading={createMutation.isPending}
        error={createMutation.error?.message}
        onClose={() => {
          setCreateOpen(false)
          createMutation.reset()
        }}
        onCreate={(payload, groupId) => {
          createMutation.mutate(
            { payload, groupId },
            {
              onSuccess: (purpose) => {
                setCreateOpen(false)
                navigate(`/purposes/${encodeURIComponent(purpose.purposeId)}`)
              },
            },
          )
        }}
        onCreateVersion={undefined}
      />
    </Box>
  )
}

export default PurposeListPage
