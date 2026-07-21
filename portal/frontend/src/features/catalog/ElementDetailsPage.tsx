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
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import type { ElementVersion, ElementVersionItem } from '../../types/catalog'
import { formatEpochTimestamp } from '../../utils/dateTime'
import { OverviewCard, PropertiesCard } from './components/CatalogDetailCards'
import DeleteVersionDialog from './components/DeleteVersionDialog'
import ElementFormDialog from './components/ElementFormDialog'
import {
  useCreateElementVersionMutation,
  useDeleteElementVersionMutation,
  useElementQuery,
  useElementVersionsQuery,
} from './hooks/useCatalogQueries'

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
  const selectedVersionItem = useMemo<ElementVersionItem | undefined>(
    () => versionsQuery.data?.versions.find((version) => version.version === selectedVersion),
    [selectedVersion, versionsQuery.data?.versions],
  )
  const displayed: ElementVersion | undefined = detail
    ? {
        ...detail,
        ...(selectedVersionItem ?? {}),
      }
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
          <Typography color="error.main">{t('catalog.elements.loadFailed')}</Typography>
          <Button variant="outlined" onClick={() => navigate('/elements')}>
            {t('catalog.elements.back')}
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
            {t('catalog.elements.newVersion')}
          </Button>
        </Stack>

        <OverviewCard
          title={t('catalog.details.overview')}
          items={[
            { label: t('catalog.fields.elementId'), value: displayed.elementId },
            {
              label: t('catalog.fields.name'),
              value: <Box component="code">{displayed.name}</Box>,
            },
            { label: t('catalog.fields.namespace'), value: displayed.namespace },
            {
              label: t('catalog.fields.type'),
              value: <Chip size="small" label={displayed.type} />,
            },
            { label: t('catalog.fields.version'), value: displayed.version },
            {
              label: t('catalog.fields.created'),
              value: formatEpochTimestamp(displayed.createdTime),
            },
            { label: t('catalog.fields.description'), value: displayed.description ?? '-' },
          ]}
        />
        <PropertiesCard schema={displayed.schema} properties={displayed.properties} />

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
                    <TableCell>{t('catalog.fields.description')}</TableCell>
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
                      <TableCell>
                        <Chip size="small" color="primary" label={version.version} />
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
          </CardContent>
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
