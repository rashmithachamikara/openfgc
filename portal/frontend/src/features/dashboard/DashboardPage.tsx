import { Box, Typography } from '@wso2/oxygen-ui'
import { useTranslation } from 'react-i18next'

function DashboardPage(): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700}>
        {t('dashboard.title')}
      </Typography>
    </Box>
  )
}

export default DashboardPage
