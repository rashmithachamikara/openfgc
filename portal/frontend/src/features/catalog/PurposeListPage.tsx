/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Box,
  Button,
  Paper,
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
  Typography,
} from '@wso2/oxygen-ui'
import { Plus } from '@wso2/oxygen-ui-icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import type { PurposeFilters } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import PurposeFormDialog from './components/PurposeFormDialog'
import { useCreatePurposeMutation, usePurposesQuery } from './hooks/useCatalogQueries'

const ROW_OPTIONS = [10, 25, 50]

function getFilters(searchParams: URLSearchParams): PurposeFilters {
  return {
    purposeName: searchParams.get('purposeName') ?? '',
    purposeVersion: searchParams.get('purposeVersion') ?? '',
    elementName: searchParams.get('elementName') ?? '',
    elementNamespace: searchParams.get('elementNamespace') ?? '',
    elementVersion: searchParams.get('elementVersion') ?? '',
    groupIds: searchParams.get('groupIds') ?? '',
  }
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
    nextFilters: PurposeFilters,
    nextPage = 0,
    nextRowsPerPage = rowsPerPage,
  ): void => {
    const params = new URLSearchParams()
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim())
    })
    if (nextPage > 0) params.set('page', String(nextPage + 1))
    if (nextRowsPerPage !== 10) params.set('rowsPerPage', String(nextRowsPerPage))
    setSearchParams(params, { replace: true })
  }
  const rows = query.data?.data ?? []

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
          </Stack>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('catalog.purposes.add')}
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
              <TextField
                size="small"
                fullWidth
                label={t('catalog.fields.purposeName')}
                value={filters.purposeName}
                onChange={(event) => updateParams({ ...filters, purposeName: event.target.value })}
              />
              <TextField
                size="small"
                fullWidth
                label={t('catalog.fields.groupIds')}
                value={filters.groupIds}
                onChange={(event) => updateParams({ ...filters, groupIds: event.target.value })}
              />
              <TextField
                size="small"
                fullWidth
                label={t('catalog.fields.purposeVersion')}
                value={filters.purposeVersion}
                onChange={(event) =>
                  updateParams({ ...filters, purposeVersion: event.target.value })
                }
              />
            </Stack>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
              <TextField
                size="small"
                fullWidth
                label={t('catalog.fields.elementName')}
                value={filters.elementName}
                onChange={(event) => updateParams({ ...filters, elementName: event.target.value })}
              />
              <TextField
                size="small"
                fullWidth
                label={t('catalog.fields.elementNamespace')}
                value={filters.elementNamespace}
                onChange={(event) =>
                  updateParams({ ...filters, elementNamespace: event.target.value })
                }
              />
              <TextField
                size="small"
                fullWidth
                label={t('catalog.fields.elementVersion')}
                value={filters.elementVersion}
                onChange={(event) =>
                  updateParams({ ...filters, elementVersion: event.target.value })
                }
              />
              <Button onClick={() => setSearchParams({}, { replace: true })} sx={{ flexShrink: 0 }}>
                {t('catalog.actions.clear')}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {query.isError ? (
          <Typography color="error.main">{t('catalog.purposes.loadFailed')}</Typography>
        ) : null}
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label={t('catalog.purposes.tableLabel')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('catalog.fields.displayName')}</TableCell>
                <TableCell>{t('catalog.fields.name')}</TableCell>
                <TableCell>{t('catalog.fields.groupId')}</TableCell>
                <TableCell>{t('catalog.fields.version')}</TableCell>
                <TableCell>{t('catalog.fields.description')}</TableCell>
                <TableCell>{t('catalog.fields.created')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.isPending
                ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`purpose-skeleton-${String(index)}`}>
                      {Array.from({ length: 6 }).map((__, cell) => (
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
                      <TableCell>{purpose.displayName ?? '-'}</TableCell>
                      <TableCell>
                        <Box component="code">{purpose.name}</Box>
                      </TableCell>
                      <TableCell>{purpose.groupId}</TableCell>
                      <TableCell>{purpose.version}</TableCell>
                      <TableCell>{purpose.description ?? '-'}</TableCell>
                      <TableCell>{formatEpochTimestamp(purpose.createdTime)}</TableCell>
                    </TableRow>
                  ))}
              {!query.isPending && !query.isError && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t('catalog.purposes.empty')}
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
