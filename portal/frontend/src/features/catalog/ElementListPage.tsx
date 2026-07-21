/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Box,
  Button,
  Chip,
  MenuItem,
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
import type { ElementFilters, ElementType } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import ElementFormDialog from './components/ElementFormDialog'
import { useCreateElementMutation, useElementsQuery } from './hooks/useCatalogQueries'

const ROW_OPTIONS = [10, 25, 50]

function getPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get('page') ?? '1')
  return Number.isInteger(page) && page > 0 ? page - 1 : 0
}

function getRowsPerPage(searchParams: URLSearchParams): number {
  const rows = Number(searchParams.get('rowsPerPage') ?? '10')
  return ROW_OPTIONS.includes(rows) ? rows : 10
}

function getFilters(searchParams: URLSearchParams): ElementFilters {
  const type = searchParams.get('type')
  return {
    name: searchParams.get('name') ?? '',
    namespace: searchParams.get('namespace') ?? '',
    type: type === 'basic' || type === 'json' || type === 'xml' ? type : 'All',
    version: searchParams.get('version') ?? '',
  }
}

function ElementListPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const filters = useMemo(() => getFilters(searchParams), [searchParams])
  const page = useMemo(() => getPage(searchParams), [searchParams])
  const rowsPerPage = useMemo(() => getRowsPerPage(searchParams), [searchParams])
  const query = useElementsQuery(filters, page, rowsPerPage)
  const createMutation = useCreateElementMutation()

  const updateParams = (
    nextFilters: ElementFilters,
    nextPage = 0,
    nextRowsPerPage = rowsPerPage,
  ): void => {
    const params = new URLSearchParams()
    if (nextFilters.name.trim()) params.set('name', nextFilters.name.trim())
    if (nextFilters.namespace.trim()) params.set('namespace', nextFilters.namespace.trim())
    if (nextFilters.type !== 'All') params.set('type', nextFilters.type)
    if (nextFilters.version.trim()) params.set('version', nextFilters.version.trim())
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
              {t('catalog.elements.title')}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('catalog.elements.add')}
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            <TextField
              size="small"
              fullWidth
              label={t('catalog.fields.name')}
              value={filters.name}
              onChange={(event) => updateParams({ ...filters, name: event.target.value })}
            />
            <TextField
              size="small"
              fullWidth
              label={t('catalog.fields.namespace')}
              value={filters.namespace}
              onChange={(event) => updateParams({ ...filters, namespace: event.target.value })}
            />
            <TextField
              select
              size="small"
              fullWidth
              label={t('catalog.fields.type')}
              value={filters.type}
              onChange={(event) =>
                updateParams({ ...filters, type: event.target.value as ElementType | 'All' })
              }
            >
              <MenuItem value="All">{t('catalog.values.all')}</MenuItem>
              <MenuItem value="basic">basic</MenuItem>
              <MenuItem value="json">json</MenuItem>
              <MenuItem value="xml">xml</MenuItem>
            </TextField>
            <TextField
              size="small"
              fullWidth
              label={t('catalog.fields.version')}
              value={filters.version}
              onChange={(event) => updateParams({ ...filters, version: event.target.value })}
            />
            <Button onClick={() => setSearchParams({}, { replace: true })} sx={{ flexShrink: 0 }}>
              {t('catalog.actions.clear')}
            </Button>
          </Stack>
        </Paper>

        {query.isError ? (
          <Typography color="error.main">{t('catalog.elements.loadFailed')}</Typography>
        ) : null}
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label={t('catalog.elements.tableLabel')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('catalog.fields.displayName')}</TableCell>
                <TableCell>{t('catalog.fields.name')}</TableCell>
                <TableCell>{t('catalog.fields.namespace')}</TableCell>
                <TableCell>{t('catalog.fields.type')}</TableCell>
                <TableCell>{t('catalog.fields.version')}</TableCell>
                <TableCell>{t('catalog.fields.created')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.isPending
                ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`element-skeleton-${String(index)}`}>
                      {Array.from({ length: 6 }).map((__, cell) => (
                        <TableCell key={`element-skeleton-${String(index)}-${String(cell)}`}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((element) => (
                    <TableRow
                      hover
                      key={element.elementId}
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/elements/${encodeURIComponent(element.elementId)}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          navigate(`/elements/${encodeURIComponent(element.elementId)}`)
                        }
                      }}
                    >
                      <TableCell>{element.displayName ?? '-'}</TableCell>
                      <TableCell>
                        <Box component="code">{element.name}</Box>
                      </TableCell>
                      <TableCell>{element.namespace}</TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={element.type} />
                      </TableCell>
                      <TableCell>{element.version}</TableCell>
                      <TableCell>{formatEpochTimestamp(element.createdTime)}</TableCell>
                    </TableRow>
                  ))}
              {!query.isPending && !query.isError && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t('catalog.elements.empty')}
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

      <ElementFormDialog
        key={`create-element-${String(createOpen)}`}
        open={createOpen}
        initialValue={undefined}
        loading={createMutation.isPending}
        error={createMutation.error?.message}
        onClose={() => {
          setCreateOpen(false)
          createMutation.reset()
        }}
        onCreate={(payload) => {
          createMutation.mutate(payload, {
            onSuccess: (element) => {
              setCreateOpen(false)
              navigate(`/elements/${encodeURIComponent(element.elementId)}`)
            },
          })
        }}
        onCreateVersion={undefined}
      />
    </Box>
  )
}

export default ElementListPage
