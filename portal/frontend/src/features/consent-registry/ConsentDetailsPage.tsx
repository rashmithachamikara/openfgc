import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Avatar,
} from '@wso2/oxygen-ui'
import { ChevronRight, CheckCircle, XCircle } from '@wso2/oxygen-ui-icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import { formatEpochSeconds, formatIsoDateTime } from '../../utils/dateTime'
import ConsentApprovalDialog from './components/ConsentApprovalDialog'
import ConsentRevocationDialog from './components/ConsentRevocationDialog'
import { getConsentStatusChipColor, getConsentStatusLabelKey } from './utils/statusChip'
import {
  useApproveConsentMutation,
  useConsentDetailQuery,
  useRevokeConsentMutation,
} from './hooks/useConsentQueries'

const LIFECYCLE_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}

const LIFECYCLE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

function formatDuration(durationInSeconds: number | undefined): string {
  if (!durationInSeconds || durationInSeconds <= 0) {
    return '-'
  }

  const hours = Math.floor(durationInSeconds / 3600)
  return `${hours}h`
}

function ConsentDetailsPage(): React.JSX.Element {
  const { t } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const consentDetailQuery = useConsentDetailQuery(id)
  const approveMutation = useApproveConsentMutation()
  const revokeMutation = useRevokeConsentMutation()
  const [approvalDialogOpen, setApprovalDialogOpen] = useState<boolean>(false)
  const [revocationDialogOpen, setRevocationDialogOpen] = useState<boolean>(false)

  if (!id) {
    return (
      <Box
        component="main"
        sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Typography variant="h5">{t('consentRegistry.details.notFound')}</Typography>
        <Box>
          <Button variant="outlined" onClick={() => navigate('/consents')}>
            {t('consentRegistry.details.back')}
          </Button>
        </Box>
      </Box>
    )
  }

  const detail = consentDetailQuery.data
  const canApprove = detail?.status === 'CREATED'
  const canRevoke = detail?.status === 'ACTIVE'

  if (consentDetailQuery.isLoading) {
    return (
      <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
        <Typography>{t('consentRegistry.messages.loading')}</Typography>
      </Box>
    )
  }

  if (consentDetailQuery.isError || !detail) {
    return (
      <Box
        component="main"
        sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Typography color="error.main">{t('consentRegistry.messages.loadFailed')}</Typography>
        <Box>
          <Button variant="outlined" onClick={() => navigate('/consents')}>
            {t('consentRegistry.details.back')}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      component="main"
      sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <Box sx={{ position: 'relative' }}>
        <Stack spacing={1}>
          <HeaderBreadcrumbs />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t('consentRegistry.details.title', 'Consent Details')}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            mt: { xs: 2, md: 0 },
            position: { xs: 'static', md: 'absolute' },
            right: { md: 0 },
            bottom: { md: 0 },
          }}
        >
          {canApprove ? (
            <Button
              variant="contained"
              color="warning"
              size="small"
              disabled={approveMutation.isPending}
              onClick={() => {
                setApprovalDialogOpen(true)
              }}
            >
              {t('consentRegistry.actions.approve')}
            </Button>
          ) : null}
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={revokeMutation.isPending || !canRevoke}
            onClick={() => {
              setRevocationDialogOpen(true)
            }}
          >
            {t('consentRegistry.actions.revoke')}
          </Button>
        </Stack>
      </Box>

      {/* Consent Details Section */}
      <Card sx={{ boxShadow: 1 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={600}>
                {t('consentRegistry.details.consentId', 'Consent ID')}: {id}
              </Typography>
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Chip
                label={t(`consentRegistry.status.${getConsentStatusLabelKey(detail.status)}`)}
                color={getConsentStatusChipColor(detail.status)}
                size="small"
                variant="outlined"
              />
              <Chip label={detail.type} color="default" size="small" variant="outlined" />
            </Stack>
          }
          sx={{ pb: 2 }}
        />
        <Divider />
        <CardContent sx={{ pt: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
              gap: { xs: 3, md: 4 },
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('consentRegistry.details.clientId', 'Client ID')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {detail.clientId}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('consentRegistry.details.recurring', 'Recurring')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {detail.recurringIndicator
                  ? t('consentRegistry.details.values.yes', 'Yes')
                  : t('consentRegistry.details.values.no', 'No')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('consentRegistry.details.frequency', 'Frequency')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {detail.frequency ?? '-'}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('consentRegistry.details.duration', 'Duration')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatDuration(detail.dataAccessValidityDuration)}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('consentRegistry.details.created', 'Created')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatEpochSeconds(detail.createdTime)}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('consentRegistry.details.validUntil', 'Valid Until')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatEpochSeconds(detail.validityTime)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Consent Purposes Section */}
      <Card sx={{ boxShadow: 1 }}>
        <CardHeader
          title={
            <Typography variant="subtitle1" fontWeight={600}>
              {t('consentRegistry.details.section.purposes', 'Consent Purposes')}
            </Typography>
          }
          sx={{ pb: 0 }}
        />
        <Divider />
        <CardContent sx={{ p: 2 }}>
          {detail.purposes.map((purpose) => {
            const approved = purpose.elements.filter((element) => element.isUserApproved).length
            const total = purpose.elements.length

            return (
              <Accordion
                key={purpose.name}
                disableGutters
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { m: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={<ChevronRight />}
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {purpose.name}
                    </Typography>
                    <Chip
                      label={`${approved}/${total} approved`}
                      color="primary"
                      size="small"
                      sx={{
                        height: 20,
                        '& .MuiChip-label': { px: 0.75, fontSize: '0.6875rem', fontWeight: 500 },
                      }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small" sx={{ '& tbody tr:hover': { bgcolor: 'action.hover' } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t('consentRegistry.details.table.element', 'Element')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t('consentRegistry.details.table.approved', 'Approved')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t('consentRegistry.details.table.required', 'Required')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t('consentRegistry.details.table.type', 'Type')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t('consentRegistry.details.table.description', 'Description')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {purpose.elements.map((element) => (
                          <TableRow key={element.name}>
                            <TableCell>
                              <code>{element.name}</code>
                            </TableCell>
                            <TableCell>
                              {element.isUserApproved ? (
                                <Box sx={{ color: 'success.main', display: 'inline-flex' }}>
                                  <CheckCircle size={16} />
                                </Box>
                              ) : (
                                <Box
                                  role="img"
                                  aria-label={t(
                                    'consentRegistry.details.notApproved',
                                    'Not approved',
                                  )}
                                  sx={{ color: 'error.main', display: 'inline-flex' }}
                                >
                                  <XCircle size={16} />
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  element.isMandatory
                                    ? t('consentRegistry.details.values.required', 'Required')
                                    : t('consentRegistry.details.values.optional', 'Optional')
                                }
                                size="small"
                                color={element.isMandatory ? 'error' : 'default'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{element.type ?? '-'}</TableCell>
                            <TableCell>{element.description ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </CardContent>
      </Card>

      {/* Authorizations Section */}
      <Card sx={{ boxShadow: 1 }}>
        <CardHeader
          title={
            <Typography variant="subtitle1" fontWeight={600}>
              {t('consentRegistry.details.section.authorizations', 'Authorizations')}
            </Typography>
          }
          sx={{ pb: 0 }}
        />
        <Divider />
        <TableContainer>
          <Table sx={{ '& tbody tr:hover': { bgcolor: 'action.hover' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.default' }}>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.user', 'User')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.status', 'Status')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.updated', 'Updated')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.resources', 'Resources')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(detail.authorizations ?? []).map((authorization) => (
                <TableRow key={authorization.id}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {(authorization.userId ?? 'U').charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">{authorization.userId ?? '-'}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t(
                        `consentRegistry.status.${getConsentStatusLabelKey(
                          authorization.status,
                          'authorization',
                        )}`,
                      )}
                      color={getConsentStatusChipColor(authorization.status)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatEpochSeconds(authorization.updatedTime)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {authorization.resources ? JSON.stringify(authorization.resources) : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Consent Lifecycle Section intentionally have mock data until backend API
        provides lifecycle timeline fields. */}

      <Card sx={{ boxShadow: 1 }}>
        <CardHeader
          title={
            <Typography variant="subtitle1" fontWeight={600}>
              {t('consentRegistry.details.section.lifecycle', 'Consent Lifecycle')} (Mock Data)
            </Typography>
          }
          sx={{ pb: 0 }}
        />
        <Divider />
        <TableContainer>
          <Table sx={{ '& tbody tr:hover': { bgcolor: 'action.hover' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.default' }}>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.eventType', 'Event Type')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.date', 'Date')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.time', 'Time')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.description', 'Description')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'action.disabled' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      Pending
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatIsoDateTime('2026-03-01T09:15:04', LIFECYCLE_DATE_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatIsoDateTime('2026-03-01T09:15:04', LIFECYCLE_TIME_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Initial consent request generated by client application.
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      Approved
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatIsoDateTime('2026-03-02T15:29:57', LIFECYCLE_DATE_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatIsoDateTime('2026-03-02T15:29:57', LIFECYCLE_TIME_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Authorization confirmed by user through banking portal.
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      Active
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatIsoDateTime('2026-03-02T15:30:00', LIFECYCLE_DATE_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatIsoDateTime('2026-03-02T15:30:00', LIFECYCLE_TIME_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Consent is now live and can be utilized for data sharing.
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow sx={{ opacity: 0.6 }}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'action.disabled' }}
                    />
                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                      Expired
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatIsoDateTime('2026-05-30T23:59:59', LIFECYCLE_DATE_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatIsoDateTime('2026-05-30T23:59:59', LIFECYCLE_TIME_FORMAT_OPTIONS)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    Scheduled expiry date based on 90-day duration policy.
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ConsentApprovalDialog
        key={`approval-${id}-${String(approvalDialogOpen)}`}
        open={approvalDialogOpen}
        consentId={id}
        purposes={detail.purposes}
        loading={approveMutation.isPending}
        onClose={() => {
          setApprovalDialogOpen(false)
        }}
        onConfirm={(selectedOptionalElements) => {
          approveMutation.mutate(
            { consentID: id, selectedOptionalElements },
            {
              onSuccess: () => {
                setApprovalDialogOpen(false)
              },
            },
          )
        }}
      />

      <ConsentRevocationDialog
        key={`revocation-${id}-${String(revocationDialogOpen)}`}
        open={revocationDialogOpen}
        consentId={id}
        loading={revokeMutation.isPending}
        onClose={() => {
          setRevocationDialogOpen(false)
        }}
        onConfirm={() => {
          revokeMutation.mutate(id, {
            onSuccess: () => {
              setRevocationDialogOpen(false)
            },
          })
        }}
      />
    </Box>
  )
}

export default ConsentDetailsPage
