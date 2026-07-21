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
  Link,
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
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import type { PurposeVersionItem } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import DeleteVersionDialog from './components/DeleteVersionDialog'
import PurposeFormDialog from './components/PurposeFormDialog'
import {
  useCreatePurposeVersionMutation,
  useDeletePurposeVersionMutation,
  usePurposeQuery,
  usePurposeVersionsQuery,
} from './hooks/useCatalogQueries'

const ORG_ID = String(import.meta.env.VITE_ORG_ID ?? '').trim()

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
          <Typography variant="caption" color="text.secondary">
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

function PurposeDetailsPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const detailQuery = usePurposeQuery(id)
  const versionsQuery = usePurposeVersionsQuery(id)
  const createVersionMutation = useCreatePurposeVersionMutation()
  const deleteMutation = useDeletePurposeVersionMutation()
  const [selectedVersion, setSelectedVersion] = useState<string>()
  const [versionDialogOpen, setVersionDialogOpen] = useState(false)
  const [deleteVersion, setDeleteVersion] = useState<string>()

  const detail = detailQuery.data
  const latestVersion = useMemo<PurposeVersionItem | undefined>(
    () =>
      detail
        ? {
            version: detail.version,
            displayName: detail.displayName,
            description: detail.description,
            properties: detail.properties,
            elements: detail.elements,
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
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      </Box>
    )
  }

  if (!id || detailQuery.isError || !detail || !displayedVersion) {
    return (
      <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={2}>
          <Typography color="error.main">{t('catalog.purposes.loadFailed')}</Typography>
          <Button variant="outlined" onClick={() => navigate('/purposes')}>
            {t('catalog.purposes.back')}
          </Button>
        </Stack>
      </Box>
    )
  }

  const organizationWide = Boolean(ORG_ID) && detail.groupId === ORG_ID
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
              label={t('catalog.fields.purposeVersion')}
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
              {t('catalog.purposes.newVersion')}
            </Button>
          </Stack>
        </Stack>

        <Card sx={{ boxShadow: 1 }}>
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.details.identity')}</Typography>}
          />
          <Divider />
          <CardContent>
            <DetailGrid
              fields={[
                { label: t('catalog.fields.purposeId'), value: detail.purposeId },
                {
                  label: t('catalog.fields.name'),
                  value: <Box component="code">{detail.name}</Box>,
                },
                {
                  label: t('catalog.fields.scope'),
                  value: organizationWide ? (
                    <Chip size="small" color="primary" label={t('catalog.purposes.orgWide')} />
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip size="small" label={t('catalog.values.specificGroup')} />
                      <Box component="code">{detail.groupId}</Box>
                    </Stack>
                  ),
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
                    <Typography variant="caption" color="text.secondary">
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
            title={<Typography fontWeight={600}>{t('catalog.details.elements')}</Typography>}
          />
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('catalog.fields.element')}</TableCell>
                  <TableCell>{t('catalog.fields.version')}</TableCell>
                  <TableCell>{t('catalog.fields.requirement')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedVersion.elements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                        sx={{ py: 3 }}
                      >
                        {t('catalog.messages.noElements')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayedVersion.elements.map((element) => {
                  const elementPath = `/elements/${encodeURIComponent(element.elementId)}`

                  return (
                    <TableRow
                      key={`${element.elementId}-${element.version}`}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(elementPath)}
                    >
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Link
                            component={RouterLink}
                            to={elementPath}
                            fontWeight={600}
                            underline="none"
                          >
                            {element.displayName ?? element.name}
                          </Link>
                          <Typography variant="caption" color="text.secondary">
                            <Box component="code">{element.name}</Box> · {element.namespace}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color="primary" label={element.version} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={element.mandatory ? 'error' : 'default'}
                          variant="outlined"
                          label={
                            element.mandatory
                              ? t('catalog.values.mandatory')
                              : t('catalog.values.optional')
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
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
                    <TableCell>{t('catalog.fields.elements')}</TableCell>
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
                      <TableCell>{version.elements.length}</TableCell>
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

      <PurposeFormDialog
        key={`purpose-version-${String(versionDialogOpen)}`}
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
            { purposeId: id, payload },
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
                if (versions.length === 1) navigate('/purposes')
              },
            },
          )
        }}
      />
    </Box>
  )
}

export default PurposeDetailsPage
