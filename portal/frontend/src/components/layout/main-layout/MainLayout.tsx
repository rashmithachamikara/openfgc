import { AppShell, Box, ColorSchemeToggle, Header, IconButton, Typography } from '@wso2/oxygen-ui'
import { CircleUserRound } from '@wso2/oxygen-ui-icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from '../sidebar/AppSidebar'

function MainLayout(): React.JSX.Element {
  const { t } = useTranslation('common')
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)

  return (
    <AppShell collapseOnSelectOnMobile>
      <AppShell.Navbar>
        <Header>
          <Header.Toggle
            collapsed={isSidebarCollapsed}
            onToggle={() => {
              setIsSidebarCollapsed((previous) => !previous)
            }}
          />
          <Header.Brand>
            <Header.BrandLogo>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                }}
              />
            </Header.BrandLogo>
            <Header.BrandTitle>OpenFGC</Header.BrandTitle>
          </Header.Brand>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            {t('layout.breadcrumb', {
              page: location.pathname.startsWith('/consents')
                ? t('sidebar.allConsents')
                : t('sidebar.dashboard'),
            })}
          </Typography>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <IconButton size="small" aria-label={t('layout.userAvatarAriaLabel')}>
              <CircleUserRound size={20} />
            </IconButton>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <AppSidebar collapsed={isSidebarCollapsed} />
      </AppShell.Sidebar>

      <AppShell.Main
        sx={{
          width: '100%',
          maxWidth: 'none',
          flex: 1,
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}

export default MainLayout
