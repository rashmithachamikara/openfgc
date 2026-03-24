import { AppShell, Box, ColorSchemeToggle, Header, IconButton } from '@wso2/oxygen-ui'
import { CircleUserRound } from '@wso2/oxygen-ui-icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import HeaderBreadcrumbs from './HeaderBreadcrumbs'
import AppSidebar from '../sidebar/AppSidebar'

function MainLayout(): React.JSX.Element {
  const { t } = useTranslation('common')
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
          <HeaderBreadcrumbs />
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

      <AppShell.Main>
        <Box
          sx={{
            width: '100%',
            maxWidth: 'none',
            flex: 1,
          }}
        >
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}

export default MainLayout
