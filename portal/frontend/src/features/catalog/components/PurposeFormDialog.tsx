/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@wso2/oxygen-ui'
import { Plus, Trash2 } from '@wso2/oxygen-ui-icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ElementSummary,
  PurposeCreateRequest,
  PurposeElementRequest,
  PurposeVersion,
  PurposeVersionCreateRequest,
} from '../../../types/catalog'
import { useElementOptionsQuery } from '../hooks/useCatalogQueries'
import PropertyEditor from './PropertyEditor'
import {
  entriesToProperties,
  propertiesToEntries,
  type PropertyEntry,
} from '../utils/formProperties'

interface PurposeElementFormRow extends PurposeElementRequest {
  id: number
  elementKey: string
}

interface PurposeFormDialogProps {
  open: boolean
  initialValue: PurposeVersion | undefined
  loading: boolean
  error: string | undefined
  onClose: () => void
  onCreate: (payload: PurposeCreateRequest, groupId?: string) => void
  onCreateVersion: ((payload: PurposeVersionCreateRequest) => void) | undefined
}

function elementKey(element: Pick<ElementSummary, 'name' | 'namespace'>): string {
  return `${element.namespace}::${element.name}`
}

function PurposeFormDialog({
  open,
  initialValue,
  loading,
  error,
  onClose,
  onCreate,
  onCreateVersion,
}: PurposeFormDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const optionsQuery = useElementOptionsQuery(open)
  const [name, setName] = useState(initialValue?.name ?? '')
  const [groupId, setGroupId] = useState('')
  const [displayName, setDisplayName] = useState(initialValue?.displayName ?? '')
  const [description, setDescription] = useState(initialValue?.description ?? '')
  const [properties, setProperties] = useState<PropertyEntry[]>(
    propertiesToEntries(initialValue?.properties),
  )
  const [elements, setElements] = useState<PurposeElementFormRow[]>(
    (initialValue?.elements ?? []).map((element, index) => ({
      id: index,
      elementKey: elementKey(element),
      name: element.name,
      namespace: element.namespace,
      version: element.version,
      mandatory: element.mandatory,
    })),
  )
  const [validationError, setValidationError] = useState('')
  const versionMode = Boolean(initialValue)

  const availableElements = optionsQuery.data?.data ?? []

  const handleSubmit = (): void => {
    if (!versionMode && !name.trim()) {
      setValidationError(t('catalog.validation.nameRequired'))
      return
    }
    if (elements.length === 0 || elements.some((element) => !element.name)) {
      setValidationError(t('catalog.validation.elementRequired'))
      return
    }
    if (new Set(elements.map((element) => element.elementKey)).size !== elements.length) {
      setValidationError(t('catalog.validation.duplicateElements'))
      return
    }

    const purposeElements = elements.map(
      ({ name: elementName, namespace, version, mandatory }) => ({
        name: elementName,
        namespace: namespace || undefined,
        version: version || undefined,
        mandatory,
      }),
    )
    const versionPayload: PurposeVersionCreateRequest = {
      displayName: displayName.trim() || undefined,
      description: description.trim() || undefined,
      properties: entriesToProperties(properties),
      elements: purposeElements,
    }

    if (versionMode && onCreateVersion) {
      onCreateVersion(versionPayload)
      return
    }

    onCreate({ ...versionPayload, name: name.trim() }, groupId.trim() || undefined)
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {versionMode ? t('catalog.purposes.newVersion') : t('catalog.purposes.createTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {versionMode ? (
            <Typography variant="body2" color="text.secondary">
              {t('catalog.messages.immutablePurpose', {
                name: initialValue?.name,
                groupId: initialValue?.groupId,
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
                label={t('catalog.fields.groupId')}
                helperText={t('catalog.help.organizationPurpose')}
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
              />
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
          <PropertyEditor entries={properties} onChange={setProperties} />

          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">{t('catalog.fields.elements')}</Typography>
              <Button
                size="small"
                startIcon={<Plus size={16} />}
                disabled={availableElements.length === 0}
                onClick={() => {
                  setElements([
                    ...elements,
                    {
                      id: Date.now(),
                      elementKey: '',
                      name: '',
                      namespace: '',
                      version: '',
                      mandatory: false,
                    },
                  ])
                }}
              >
                {t('catalog.actions.addElement')}
              </Button>
            </Stack>
            {optionsQuery.isLoading ? (
              <Typography variant="body2">{t('catalog.messages.loadingElements')}</Typography>
            ) : null}
            {!optionsQuery.isLoading && availableElements.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('catalog.messages.createElementFirst')}
              </Typography>
            ) : null}
            {elements.map((row) => (
              <Stack
                key={row.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
              >
                <TextField
                  select
                  required
                  fullWidth
                  size="small"
                  label={t('catalog.fields.element')}
                  value={row.elementKey}
                  onChange={(event) => {
                    const selected = availableElements.find(
                      (element) => elementKey(element) === event.target.value,
                    )
                    setElements(
                      elements.map((item) =>
                        item.id === row.id
                          ? {
                              ...item,
                              elementKey: event.target.value,
                              name: selected?.name ?? '',
                              namespace: selected?.namespace ?? '',
                              version: selected?.version ?? '',
                            }
                          : item,
                      ),
                    )
                  }}
                >
                  {availableElements.map((element) => (
                    <MenuItem key={element.elementId} value={elementKey(element)}>
                      {element.displayName ?? element.name} ({element.namespace})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label={t('catalog.fields.version')}
                  value={row.version ?? ''}
                  onChange={(event) => {
                    setElements(
                      elements.map((item) =>
                        item.id === row.id ? { ...item, version: event.target.value } : item,
                      ),
                    )
                  }}
                  sx={{ width: { sm: 130 } }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={row.mandatory}
                      onChange={(event) => {
                        setElements(
                          elements.map((item) =>
                            item.id === row.id
                              ? { ...item, mandatory: event.target.checked }
                              : item,
                          ),
                        )
                      }}
                    />
                  }
                  label={t('catalog.fields.mandatory')}
                />
                <IconButton
                  aria-label={t('catalog.actions.removeElement')}
                  onClick={() => setElements(elements.filter((item) => item.id !== row.id))}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
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

export default PurposeFormDialog
