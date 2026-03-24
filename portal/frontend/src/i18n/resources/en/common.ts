const commonEn = {
  app: {
    title: 'OpenFGC Portal',
  },
  sidebar: {
    ariaLabel: 'Primary navigation',
    dashboard: 'Dashboard',
    allConsents: 'All Consents',
  },
  layout: {
    home: 'Home',
    breadcrumbAriaLabel: 'Breadcrumb',
    userAvatarAriaLabel: 'Signed-in user avatar',
  },
  dashboard: {
    title: 'Dashboard',
  },
  consentRegistry: {
    title: 'All Consents',
    actions: {
      view: 'View',
      revoke: 'Revoke',
      approve: 'Approve',
    },
    status: {
      all: 'All',
      active: 'Active',
      pending: 'Pending',
      revoked: 'Revoked',
      expired: 'Expired',
    },
    filters: {
      sectionAriaLabel: 'Consent filters',
      status: 'Status',
      startDate: 'Start date',
      endDate: 'End date',
      consentType: 'Consent type',
      clear: 'Clear',
    },
    table: {
      tableAriaLabel: 'Consent registry table',
      clientLabel: 'Client: {{client}}',
      headers: {
        consentId: 'Consent ID',
        type: 'Type',
        status: 'Status',
        purposes: 'Purposes',
        created: 'Created',
        actions: 'Actions',
      },
    },
  },
} as const

export default commonEn
