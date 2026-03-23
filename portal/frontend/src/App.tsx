import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Stack,
  TextField,
  Typography,
  Chip,
  Divider,
  ColorSchemeToggle,
} from '@wso2/oxygen-ui'
import { useTranslation } from 'react-i18next'

function App(): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        px: 3,
        py: 6,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h3" fontWeight={700}>
          {t('app.title')}
        </Typography>
        <Chip label={t('app.themeChipLabel')} color="primary" size="small" />
        <ColorSchemeToggle />
      </Stack>

      <Typography variant="body1" color="text.secondary">
        {t('app.description')}
      </Typography>

      <Divider sx={{ width: '100%', maxWidth: 600, alignSelf: 'center' }} />

      <Card
        sx={{
          width: '100%',
          maxWidth: 500,
          backdropFilter: 'blur(var(--oxygen-blur-medium, 8px))',
        }}
        variant="outlined"
      >
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {t('app.getStartedTitle')}
          </Typography>
          <Stack spacing={2} mt={1}>
            <TextField label={t('forms.nameLabel')} fullWidth />
            <TextField label={t('forms.emailLabel')} type="email" fullWidth />
          </Stack>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" fullWidth>
            {t('buttons.submit')}
          </Button>
        </CardActions>
      </Card>

      <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
        <Button variant="contained">{t('buttons.contained')}</Button>
        <Button variant="outlined">{t('buttons.outlined')}</Button>
        <Button variant="text">{t('buttons.text')}</Button>
        <Button variant="contained" color="secondary">
          {t('buttons.secondary')}
        </Button>
        <Button variant="contained" disabled>
          {t('buttons.disabled')}
        </Button>
      </Stack>
    </Box>
  )
}

export default App
