/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@wso2/oxygen-ui'
import { useTranslation } from 'react-i18next'

interface DeleteVersionDialogProps {
  open: boolean
  version: string
  loading: boolean
  error: string | undefined
  onClose: () => void
  onConfirm: () => void
}

function DeleteVersionDialog({
  open,
  version,
  loading,
  error,
  onClose,
  onConfirm,
}: DeleteVersionDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('catalog.delete.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography>{t('catalog.delete.message', { version })}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('catalog.delete.warning')}
          </Typography>
          {error ? (
            <Typography variant="body2" color="error.main">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('catalog.actions.cancel')}
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? t('catalog.actions.deleting') : t('catalog.actions.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteVersionDialog
