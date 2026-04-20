import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@wso2/oxygen-ui'
import { AlertTriangle } from '@wso2/oxygen-ui-icons-react'
import { useTranslation } from 'react-i18next'

interface ConsentRevocationDialogProps {
  open: boolean
  consentId: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

function ConsentRevocationDialog({
  open,
  consentId,
  loading,
  onClose,
  onConfirm,
}: ConsentRevocationDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: (theme) => ({
          borderRadius: 1,
          ...theme.applyStyles('light', { bgcolor: theme.palette.grey[50] }),
          ...theme.applyStyles('dark', { bgcolor: 'rgba(255, 255, 255, 0.06)' }),
        }),
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant="h6" fontWeight={700}>
            {t('consentRegistry.modals.revocation.title', 'Confirm Revocation')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'consentRegistry.modals.revocation.message',
              'Are you sure you want to revoke all data permissions?',
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 300 }}>
            {t('consentRegistry.modals.consentId', 'Consent ID')}: {consentId}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 3.5, pb: 3 }}>
        <Stack spacing={2} sx={{ mt: 3 }}>
          <Box
            sx={{
              width: '100%',
              p: 2,
              border: 1,
              borderColor: 'error.light',
              borderRadius: 1,
              bgcolor: 'error.lighter',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'error.main',
                bgcolor: 'background.paper',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t(
                'consentRegistry.modals.revocation.note',
                'This action revokes both mandatory and optional data permissions for this consent.',
              )}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <Button fullWidth color="error" variant="contained" disabled={loading} onClick={onConfirm}>
          {loading
            ? t('consentRegistry.modals.actions.processing', 'Processing...')
            : t('consentRegistry.modals.revocation.confirm', 'Revoke All Data')}
        </Button>
        <Button fullWidth variant="outlined" disabled={loading} onClick={onClose}>
          {t('consentRegistry.modals.revocation.cancel', 'Keep Permissions')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConsentRevocationDialog
