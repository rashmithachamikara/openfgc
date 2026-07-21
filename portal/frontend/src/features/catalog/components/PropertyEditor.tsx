/*
 * Copyright (c) 2026, WSO2 LLC. (https://wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { Box, Button, IconButton, Stack, TextField, Typography } from '@wso2/oxygen-ui'
import { Plus, Trash2 } from '@wso2/oxygen-ui-icons-react'
import { useTranslation } from 'react-i18next'
import type { PropertyEntry } from '../utils/formProperties'

interface PropertyEditorProps {
  entries: PropertyEntry[]
  onChange: (entries: PropertyEntry[]) => void
}

function PropertyEditor({ entries, onChange }: PropertyEditorProps): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">{t('catalog.fields.properties')}</Typography>
        <Button
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => {
            onChange([...entries, { id: Date.now(), key: '', value: '' }])
          }}
        >
          {t('catalog.actions.addProperty')}
        </Button>
      </Stack>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('catalog.messages.noProperties')}
        </Typography>
      ) : null}
      {entries.map((entry) => (
        <Stack key={entry.id} direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label={t('catalog.fields.propertyKey')}
            value={entry.key}
            onChange={(event) => {
              onChange(
                entries.map((item) =>
                  item.id === entry.id ? { ...item, key: event.target.value } : item,
                ),
              )
            }}
            fullWidth
          />
          <TextField
            size="small"
            label={t('catalog.fields.propertyValue')}
            value={entry.value}
            onChange={(event) => {
              onChange(
                entries.map((item) =>
                  item.id === entry.id ? { ...item, value: event.target.value } : item,
                ),
              )
            }}
            fullWidth
          />
          <Box>
            <IconButton
              aria-label={t('catalog.actions.removeProperty')}
              onClick={() => {
                onChange(entries.filter((item) => item.id !== entry.id))
              }}
            >
              <Trash2 size={17} />
            </IconButton>
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

export default PropertyEditor
