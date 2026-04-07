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
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import HeaderBreadcrumbs from '../../components/layout/main-layout/HeaderBreadcrumbs'
import { useConsentDetailQuery, useRevokeConsentMutation } from './hooks/useConsentQueries'

function formatEpoch(epochInSeconds: number | undefined): string {
  if (!epochInSeconds) {
    return '-'
  }

  return new Date(epochInSeconds * 1000).toLocaleString()
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
  const revokeMutation = useRevokeConsentMutation()

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
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={revokeMutation.isPending}
            onClick={() => {
              revokeMutation.mutate(id)
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
                label={detail.status}
                color={detail.status === 'ACTIVE' ? 'success' : 'warning'}
                size="small"
                variant="filled"
              />
              <Chip
                label={detail.type}
                size="small"
                variant="filled"
                sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}
              />
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
                {detail.recurringIndicator ? 'Yes' : 'No'}
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
                {formatEpoch(detail.createdTime)}
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
                {formatEpoch(detail.validityTime)}
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
                                label={element.isMandatory ? 'Required' : 'Optional'}
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
                  {t('consentRegistry.details.table.authId', 'Auth ID')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.user', 'User')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {t('consentRegistry.details.table.type', 'Type')}
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
                    <code>{authorization.id}</code>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {(authorization.userId ?? 'U').charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">{authorization.userId ?? '-'}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{authorization.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={authorization.status}
                      color="success"
                      size="small"
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatEpoch(authorization.updatedTime)}
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
    </Box>
  )
}

export default ConsentDetailsPage
