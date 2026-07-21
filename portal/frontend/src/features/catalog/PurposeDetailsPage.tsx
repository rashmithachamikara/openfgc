/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@wso2/oxygen-ui'
import { Plus, Trash2 } from '@wso2/oxygen-ui-icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import type { PurposeVersion, PurposeVersionItem } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import { OverviewCard, PropertiesCard } from './components/CatalogDetailCards'
import DeleteVersionDialog from './components/DeleteVersionDialog'
import PurposeFormDialog from './components/PurposeFormDialog'
import {
  useCreatePurposeVersionMutation,
  useDeletePurposeVersionMutation,
  usePurposeQuery,
  usePurposeVersionsQuery,
} from './hooks/useCatalogQueries'

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
  const selectedVersionItem = useMemo<PurposeVersionItem | undefined>(
    () => versionsQuery.data?.versions.find((version) => version.version === selectedVersion),
    [selectedVersion, versionsQuery.data?.versions],
  )
  const displayed: PurposeVersion | undefined = detail
    ? { ...detail, ...(selectedVersionItem ?? {}) }
    : undefined

  if (detailQuery.isLoading) {
    return (
      <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          <HeaderBreadcrumbs />
          <Skeleton width={300} height={48} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      </Box>
    )
  }

  if (!id || detailQuery.isError || !displayed) {
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

  const versions = versionsQuery.data?.versions ?? []

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
              {displayed.displayName ?? displayed.name}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setVersionDialogOpen(true)}
          >
            {t('catalog.purposes.newVersion')}
          </Button>
        </Stack>

        <OverviewCard
          title={t('catalog.details.overview')}
          items={[
            { label: t('catalog.fields.purposeId'), value: displayed.purposeId },
            {
              label: t('catalog.fields.name'),
              value: <Box component="code">{displayed.name}</Box>,
            },
            { label: t('catalog.fields.groupId'), value: displayed.groupId },
            { label: t('catalog.fields.version'), value: displayed.version },
            {
              label: t('catalog.fields.created'),
              value: formatEpochTimestamp(displayed.createdTime),
            },
            { label: t('catalog.fields.description'), value: displayed.description ?? '-' },
          ]}
        />
        <PropertiesCard properties={displayed.properties} schema={undefined} />

        <Card variant="outlined">
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.details.elements')}</Typography>}
          />
          <Divider />
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('catalog.fields.element')}</TableCell>
                    <TableCell>{t('catalog.fields.name')}</TableCell>
                    <TableCell>{t('catalog.fields.namespace')}</TableCell>
                    <TableCell>{t('catalog.fields.version')}</TableCell>
                    <TableCell>{t('catalog.fields.requirement')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayed.elements.map((element) => (
                    <TableRow key={`${element.elementId}-${element.version}`}>
                      <TableCell>
                        <Link
                          component={RouterLink}
                          to={`/elements/${encodeURIComponent(element.elementId)}`}
                        >
                          {element.displayName ?? element.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Box component="code">{element.name}</Box>
                      </TableCell>
                      <TableCell>{element.namespace}</TableCell>
                      <TableCell>{element.version}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader
            title={<Typography fontWeight={600}>{t('catalog.details.versions')}</Typography>}
          />
          <Divider />
          <CardContent sx={{ p: 0 }}>
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
                  {versions.map((version) => (
                    <TableRow
                      hover
                      key={version.version}
                      selected={displayed.version === version.version}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedVersion(version.version)}
                    >
                      <TableCell>{version.version}</TableCell>
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
          </CardContent>
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
