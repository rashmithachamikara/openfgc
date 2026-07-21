/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@wso2/oxygen-ui'
import { Eye, Plus, Trash2 } from '@wso2/oxygen-ui-icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import type { ElementVersionItem } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import DeleteVersionDialog from './components/DeleteVersionDialog'
import ElementFormDialog from './components/ElementFormDialog'
import ElementTypeChip from './components/ElementTypeChip'
import {
  useCreateElementVersionMutation,
  useDeleteElementVersionMutation,
  useElementQuery,
  useElementVersionsQuery,
} from './hooks/useCatalogQueries'

interface DetailField {
  label: string
  value: React.ReactNode
}

function DetailGrid({ fields }: { fields: DetailField[] }): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: { xs: 2, md: 3 },
      }}
    >
      {fields.map((field) => (
        <Stack key={field.label} spacing={0.5} minWidth={0}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {field.label}
          </Typography>
          <Typography component="div" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {field.value || '-'}
          </Typography>
        </Stack>
      ))}
    </Box>
  )
}

function ElementDetailsPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const detailQuery = useElementQuery(id)
  const versionsQuery = useElementVersionsQuery(id)
  const createVersionMutation = useCreateElementVersionMutation()
  const deleteMutation = useDeleteElementVersionMutation()
  const [selectedVersion, setSelectedVersion] = useState<string>()
  const [versionDialogOpen, setVersionDialogOpen] = useState(false)
  const [deleteVersion, setDeleteVersion] = useState<string>()

  const detail = detailQuery.data
  const latestVersion = useMemo<ElementVersionItem | undefined>(
    () =>
      detail
        ? {
            version: detail.version,
            displayName: detail.displayName,
            description: detail.description,
            schema: detail.schema,
            properties: detail.properties,
            createdTime: detail.createdTime,
          }
        : undefined,
    [detail],
  )
  const versions = useMemo(() => versionsQuery.data?.versions ?? [], [versionsQuery.data?.versions])
  const versionOptions = useMemo(() => {
    if (!latestVersion || versions.some((version) => version.version === latestVersion.version)) {
      return versions
    }
    return [latestVersion, ...versions]
  }, [latestVersion, versions])
  const displayedVersion =
    versionOptions.find((version) => version.version === selectedVersion) ?? latestVersion

  if (detailQuery.isLoading) {
    return (
      <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          <HeaderBreadcrumbs />
          <Skeleton width={300} height={48} />
          <Skeleton variant="rounded" height={190} />
          <Skeleton variant="rounded" height={240} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      </Box>
    )
  }

  if (!id || detailQuery.isError || !detail || !displayedVersion) {
    return (
      <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={2}>
          <Typography color="error.main">{t('catalog.elements.loadFailed')}</Typography>
          <Button variant="outlined" onClick={() => navigate('/elements')}>
            {t('catalog.elements.back')}
          </Button>
        </Stack>
      </Box>
    )
  }

  const propertyEntries = Object.entries(displayedVersion.properties ?? {})

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ md: 'flex-end' }}
          spacing={2}
        >
          <Stack spacing={0.75} minWidth={0}>
            <HeaderBreadcrumbs />
            <Typography variant="h4" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
              {displayedVersion.displayName ?? detail.name}
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1}>
            <Chip size="small" color="primary" label={displayedVersion.version} />
            {displayedVersion.version === detail.version ? (
              <Chip size="small" variant="outlined" label={t('catalog.values.latest')} />
            ) : null}
            <TextField
              select
              size="small"
              label={t('catalog.fields.elementVersion')}
              value={displayedVersion.version}
              disabled={versionsQuery.isLoading || versionOptions.length === 0}
              onChange={(event) => {
                const version = event.target.value
                setSelectedVersion(version === detail.version ? undefined : version)
              }}
              sx={{ minWidth: 150 }}
            >
              {versionOptions.map((version) => (
                <MenuItem key={version.version} value={version.version}>
                  {version.version}
                  {version.version === detail.version ? ` · ${t('catalog.values.latest')}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => setVersionDialogOpen(true)}
            >
              {t('catalog.elements.newVersion')}
            </Button>
          </Stack>
        </Stack>

        <Card sx={{ boxShadow: 1 }}>
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.details.elementIdentity')}</Typography>}
          />
          <Divider />
          <CardContent>
            <DetailGrid
              fields={[
                { label: t('catalog.fields.elementId'), value: detail.elementId },
                {
                  label: t('catalog.fields.name'),
                  value: <Box component="code">{detail.name}</Box>,
                },
                { label: t('catalog.fields.namespace'), value: detail.namespace || '-' },
                {
                  label: t('catalog.fields.type'),
                  value: <ElementTypeChip type={detail.type} />,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card sx={{ boxShadow: 1 }}>
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.details.versionDetails')}</Typography>}
          />
          <Divider />
          <CardContent>
            <DetailGrid
              fields={[
                {
                  label: t('catalog.fields.version'),
                  value: <Chip size="small" color="primary" label={displayedVersion.version} />,
                },
                {
                  label: t('catalog.fields.displayName'),
                  value: displayedVersion.displayName ?? '-',
                },
                {
                  label: t('catalog.fields.created'),
                  value: formatEpochTimestamp(displayedVersion.createdTime),
                },
                {
                  label: t('catalog.fields.description'),
                  value: displayedVersion.description ?? '-',
                },
              ]}
            />
          </CardContent>
        </Card>

        {detail.type !== 'basic' ? (
          <Card sx={{ boxShadow: 1 }}>
            <CardHeader
              title={<Typography fontWeight={600}>{t('catalog.fields.schema')}</Typography>}
            />
            <Divider />
            <CardContent>
              {displayedVersion.schema ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {displayedVersion.schema}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('catalog.messages.noSchema')}
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card sx={{ boxShadow: 1 }}>
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.fields.properties')}</Typography>}
          />
          <Divider />
          <CardContent>
            {propertyEntries.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                {propertyEntries.map(([key, value]) => (
                  <Stack key={key} spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {key}
                    </Typography>
                    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                      {value}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('catalog.messages.noProperties')}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ boxShadow: 1 }}>
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.details.versions')}</Typography>}
          />
          <Divider />
          {versionsQuery.isLoading ? (
            <CardContent>
              <Stack spacing={1}>
                <Skeleton height={36} />
                <Skeleton height={36} />
                <Skeleton height={36} />
              </Stack>
            </CardContent>
          ) : null}
          {versionsQuery.isError ? (
            <CardContent>
              <Alert severity="error">
                {versionsQuery.error?.message || t('catalog.messages.versionsLoadFailed')}
              </Alert>
            </CardContent>
          ) : null}
          {!versionsQuery.isLoading && !versionsQuery.isError ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('catalog.fields.version')}</TableCell>
                    <TableCell>{t('catalog.fields.displayName')}</TableCell>
                    <TableCell>{t('catalog.fields.description')}</TableCell>
                    <TableCell>{t('catalog.fields.created')}</TableCell>
                    <TableCell align="right">{t('catalog.fields.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versionOptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {t('catalog.messages.noVersions')}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {versionOptions.map((version) => (
                    <TableRow
                      hover
                      key={version.version}
                      selected={displayedVersion.version === version.version}
                      sx={{ cursor: 'pointer' }}
                      onClick={() =>
                        setSelectedVersion(
                          version.version === detail.version ? undefined : version.version,
                        )
                      }
                    >
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                          <Chip size="small" color="primary" label={version.version} />
                          {displayedVersion.version === version.version ? (
                            <Chip
                              size="small"
                              icon={<Eye size={14} />}
                              label={t('catalog.values.viewing')}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>{version.displayName ?? '-'}</TableCell>
                      <TableCell>{version.description ?? '-'}</TableCell>
                      <TableCell>{formatEpochTimestamp(version.createdTime)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('catalog.actions.deleteVersion')}>
                          <IconButton
                            size="small"
                            aria-label={t('catalog.actions.deleteVersion')}
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeleteVersion(version.version)
                            }}
                          >
                            <Trash2 size={17} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </Card>
      </Stack>

      <ElementFormDialog
        key={`element-version-${String(versionDialogOpen)}`}
        open={versionDialogOpen}
        initialValue={detail}
        loading={createVersionMutation.isPending}
        error={createVersionMutation.error?.message}
        onClose={() => {
          setVersionDialogOpen(false)
          createVersionMutation.reset()
        }}
        onCreate={() => {}}
        onCreateVersion={(payload) => {
          createVersionMutation.mutate(
            { elementId: id, payload },
            {
              onSuccess: (version) => {
                setVersionDialogOpen(false)
                setSelectedVersion(version.version)
              },
            },
          )
        }}
      />
      <DeleteVersionDialog
        open={Boolean(deleteVersion)}
        version={deleteVersion ?? ''}
        loading={deleteMutation.isPending}
        error={deleteMutation.error?.message}
        onClose={() => {
          setDeleteVersion(undefined)
          deleteMutation.reset()
        }}
        onConfirm={() => {
          if (!deleteVersion) return
          deleteMutation.mutate(
            { id, version: deleteVersion },
            {
              onSuccess: () => {
                setDeleteVersion(undefined)
                setSelectedVersion(undefined)
                if (versions.length === 1) navigate('/elements')
              },
            },
          )
        }}
      />
    </Box>
  )
}

export default ElementDetailsPage
