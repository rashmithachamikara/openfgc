const commonEn = {
  app: {
    title: 'OpenFGC Portal',
    themeChipLabel: 'Acrylic Orange',
    description: 'React project powered by WSO2 Oxygen UI with the Acrylic Orange theme.',
    getStartedTitle: 'Get started',
  },
  forms: {
    nameLabel: 'Name',
    emailLabel: 'Email',
  },
  buttons: {
    submit: 'Submit',
    contained: 'Contained',
    outlined: 'Outlined',
    text: 'Text',
    secondary: 'Secondary',
    disabled: 'Disabled',
  },
  sidebar: {
    ariaLabel: 'Primary navigation',
    dashboard: 'Dashboard',
    allConsents: 'All Consents',
    settings: 'Settings',
  },
  layout: {
    menu: 'Menu',
    openNavigation: 'Open navigation menu',
    breadcrumb: 'Home / {{page}}',
    userAvatarAriaLabel: 'Signed-in user avatar',
  },
  dashboard: {
    title: 'Dashboard',
  },
  consentRegistry: {
    title: 'All Consents',
    breadcrumb: 'Home / All Consents',
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
      footer: {
        summary: 'Showing {{shown}} of {{total}} consents',
        rowsPerPage: 'Rows per page',
        paginationAriaLabel: 'Pagination controls',
      },
    },
  },
} as const

export default commonEn
