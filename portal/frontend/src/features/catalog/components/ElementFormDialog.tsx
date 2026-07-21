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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@wso2/oxygen-ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ElementCreateRequest,
  ElementType,
  ElementVersion,
  ElementVersionCreateRequest,
} from '../../../types/catalog'
import PropertyEditor from './PropertyEditor'
import {
  entriesToProperties,
  propertiesToEntries,
  type PropertyEntry,
} from '../utils/formProperties'

interface ElementFormDialogProps {
  open: boolean
  initialValue: ElementVersion | undefined
  loading: boolean
  error: string | undefined
  onClose: () => void
  onCreate: (payload: ElementCreateRequest) => void
  onCreateVersion: ((payload: ElementVersionCreateRequest) => void) | undefined
}

function ElementFormDialog({
  open,
  initialValue,
  loading,
  error,
  onClose,
  onCreate,
  onCreateVersion,
}: ElementFormDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [name, setName] = useState(initialValue?.name ?? '')
  const [namespace, setNamespace] = useState(initialValue?.namespace ?? '')
  const [type, setType] = useState<ElementType>(initialValue?.type ?? 'basic')
  const [displayName, setDisplayName] = useState(initialValue?.displayName ?? '')
  const [description, setDescription] = useState(initialValue?.description ?? '')
  const [schema, setSchema] = useState(initialValue?.schema ?? '')
  const [properties, setProperties] = useState<PropertyEntry[]>(
    propertiesToEntries(initialValue?.properties),
  )
  const [validationError, setValidationError] = useState('')
  const versionMode = Boolean(initialValue)

  const handleSubmit = (): void => {
    if (!versionMode && !name.trim()) {
      setValidationError(t('catalog.validation.nameRequired'))
      return
    }
    if ((type === 'json' || type === 'xml') && !schema.trim()) {
      setValidationError(t('catalog.validation.schemaRequired'))
      return
    }

    const versionPayload: ElementVersionCreateRequest = {
      displayName: displayName.trim() || undefined,
      description: description.trim() || undefined,
      schema: schema.trim() || undefined,
      properties: entriesToProperties(properties),
    }

    if (versionMode && onCreateVersion) {
      onCreateVersion(versionPayload)
      return
    }

    onCreate({
      ...versionPayload,
      name: name.trim(),
      namespace: namespace.trim() || undefined,
      type,
    })
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {versionMode ? t('catalog.elements.newVersion') : t('catalog.elements.createTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {versionMode ? (
            <Typography variant="body2" color="text.secondary">
              {t('catalog.messages.immutableElement', {
                name: initialValue?.name,
                namespace: initialValue?.namespace,
                type: initialValue?.type,
              })}
            </Typography>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                fullWidth
                label={t('catalog.fields.name')}
                value={name}
                slotProps={{ htmlInput: { maxLength: 255 } }}
                onChange={(event) => setName(event.target.value)}
              />
              <TextField
                fullWidth
                label={t('catalog.fields.namespace')}
                helperText={t('catalog.help.defaultNamespace')}
                value={namespace}
                slotProps={{ htmlInput: { maxLength: 255 } }}
                onChange={(event) => setNamespace(event.target.value)}
              />
              <FormControl fullWidth required>
                <InputLabel id="element-type-label">{t('catalog.fields.type')}</InputLabel>
                <Select
                  labelId="element-type-label"
                  value={type}
                  label={t('catalog.fields.type')}
                  onChange={(event) => setType(event.target.value as ElementType)}
                >
                  <MenuItem value="basic">basic</MenuItem>
                  <MenuItem value="json">json</MenuItem>
                  <MenuItem value="xml">xml</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
          <TextField
            fullWidth
            label={t('catalog.fields.displayName')}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t('catalog.fields.description')}
            value={description}
            slotProps={{ htmlInput: { maxLength: 1024 } }}
            onChange={(event) => setDescription(event.target.value)}
          />
          {type !== 'basic' ? (
            <TextField
              required
              fullWidth
              multiline
              minRows={5}
              label={t('catalog.fields.schema')}
              value={schema}
              onChange={(event) => setSchema(event.target.value)}
            />
          ) : null}
          <PropertyEditor entries={properties} embedded={false} onChange={setProperties} />
          {validationError || error ? (
            <Typography color="error.main" variant="body2">
              {validationError || error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {t('catalog.actions.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? t('catalog.actions.saving') : t('catalog.actions.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ElementFormDialog
