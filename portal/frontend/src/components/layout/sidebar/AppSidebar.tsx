import { Sidebar } from '@wso2/oxygen-ui'
import { House, ShieldCheck } from '@wso2/oxygen-ui-icons-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

interface AppSidebarProps {
  collapsed: boolean
}

interface SidebarItem {
  id: string
  labelKey: string
  path: string
  icon: React.JSX.Element
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.dashboard',
    path: '/dashboard',
    icon: <House size={18} />,
  },
  {
    id: 'all-consents',
    labelKey: 'sidebar.allConsents',
    path: '/consents',
    icon: <ShieldCheck size={18} />,
  },
]

function mapPathToMenuId(pathname: string): string {
  if (pathname.startsWith('/dashboard')) {
    return 'dashboard'
  }

  if (pathname.startsWith('/consents')) {
    return 'all-consents'
  }

  return 'dashboard'
}

function AppSidebar({ collapsed }: AppSidebarProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()

  const activeItem = mapPathToMenuId(location.pathname)

  return (
    <Sidebar
      collapsed={collapsed}
      activeItem={activeItem}
      onSelect={(id) => {
        const selectedItem = SIDEBAR_ITEMS.find((item) => item.id === id)

        if (selectedItem) {
          navigate(selectedItem.path)
        }
      }}
      aria-label={t('sidebar.ariaLabel')}
    >
      <Sidebar.Nav>
        <Sidebar.Category>
          {SIDEBAR_ITEMS.map((item) => (
            <Sidebar.Item key={item.id} id={item.id}>
              <Sidebar.ItemIcon>{item.icon}</Sidebar.ItemIcon>
              <Sidebar.ItemLabel>{t(item.labelKey)}</Sidebar.ItemLabel>
            </Sidebar.Item>
          ))}
        </Sidebar.Category>
      </Sidebar.Nav>
    </Sidebar>
  )
}

export default AppSidebar
