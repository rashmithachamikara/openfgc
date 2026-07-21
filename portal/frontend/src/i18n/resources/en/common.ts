/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const commonEn = {
  app: {
    title: 'Consent Portal',
  },
  sidebar: {
    ariaLabel: 'Primary navigation',
    dashboard: 'Dashboard',
    consent: 'Consent',
    allConsents: 'All Consents',
    pendingConsents: 'Pending Consents',
    catalog: 'Definitions',
    purposes: 'Purposes',
    elements: 'Elements',
  },
  layout: {
    home: 'Home',
    breadcrumbAriaLabel: 'Breadcrumb',
    userMenu: {
      unknownUser: 'Unknown user',
      noEmail: 'No email available',
      signOut: 'Sign out',
      signOutError: 'Unable to sign out. Please try again.',
      tryAgain: 'Try again',
    },
  },
  dashboard: {
    title: 'Dashboard',
  },
  consentRegistry: {
    title: 'All Consents',
    details: {
      title: 'Consent Details',
      consentId: 'Consent ID',
      status: 'Status',
      type: 'Consent Type',
      frequency: 'Access Limit',
      frequencyHelp: 'This indicates how many times this consent can be accessed per day.',
      frequencyUnitSingular: 'time per day',
      frequencyUnitPlural: 'times per day',
      purposes: 'Purposes',
      duration: 'Lookback Period',
      durationHelp:
        'This defines how far back data can be accessed. For example, if set to 6 months, data from up to 6 months ago is accessible.',
      durationUnitHourSingular: 'hour',
      durationUnitHourPlural: 'hours',
      durationUnitDaySingular: 'day',
      durationUnitDayPlural: 'days',
      durationUnitYearSingular: 'year',
      durationUnitYearPlural: 'years',
      created: 'Created',
      updated: 'Updated',
      validUntil: 'Valid Until',
      groupId: 'Group ID',
      recurring: 'Recurring',
      back: 'Back to Registry',
      notFound: 'Consent record not found',
      approved: 'Approved',
      notApproved: 'Not approved',
      approvedCount: '{{approved}}/{{total}} approved',
      section: {
        purposes: 'Consent Purposes',
        authorizations: 'Authorizations',
        lifecycle: 'Consent Lifecycle',
      },
      table: {
        element: 'Element',
        approved: 'Approved',
        required: 'Required',
        description: 'Description',
        user: 'User',
        status: 'Status',
        updated: 'Updated',
        resources: 'Resources',
        eventType: 'Event Type',
        date: 'Date',
        time: 'Time',
      },
      actions: {
        viewResources: 'View Resources',
        noResourcesTooltip: 'No resources available',
      },
      resourcesModal: {
        title: 'Authorization Resources',
        authRef: 'Auth',
        close: 'Close',
      },
      values: {
        yes: 'Yes',
        no: 'No',
        required: 'Required',
        optional: 'Optional',
      },
    },
    actions: {
      view: 'View',
      revoke: 'Revoke',
      approve: 'Approve',
    },
    modals: {
      consentId: 'Consent ID',
      actions: {
        cancel: 'Cancel',
        processing: 'Processing...',
      },
      approval: {
        title: 'Review & Approve Consent',
        subtitle: 'Please review the consent elements before approval.',
        mandatory: 'Mandatory Elements (Required)',
        optional: 'Optional Elements',
        required: 'Required',
        toggle: 'Toggle permission',
        toggleWithDetails: 'Toggle permission for {{elementLabel}} in {{purposeLabel}}',
        loading: 'Loading consent details...',
        noMandatory: 'No mandatory requirements for this consent.',
        confirm: 'Approve & Continue',
      },
      revocation: {
        title: 'Confirm Revocation',
        message: 'Are you sure you want to revoke consent?',
        note: 'This action revokes both mandatory and optional consents granted for all associated purposes.',
        confirm: 'Revoke Consents',
        cancel: 'Cancel',
      },
    },
    status: {
      all: 'All',
      active: 'Active',
      pending: 'Pending',
      created: 'Created',
      approved: 'Approved',
      rejected: 'Rejected',
      revoked: 'Revoked',
      expired: 'Expired',
      systemExpired: 'System Expired',
      systemRevoked: 'System Revoked',
    },
    filters: {
      sectionAriaLabel: 'Consent filters',
      status: 'Status',
      startDate: 'Start date',
      startDateAriaLabel: 'Start date filter',
      endDate: 'End date',
      endDateAriaLabel: 'End date filter',
      consentType: 'Consent type',
      clear: 'Clear',
      clearAriaLabel: 'Clear all filters',
    },
    messages: {
      loading: 'Loading consents...',
      loadFailed: 'Unable to load consents right now.',
      empty: 'No consents found for the selected filters.',
    },
    table: {
      tableAriaLabel: 'Consent registry table',
      groupLabel: 'Group ID: {{groupId}}',
      notApplicable: 'Not applicable',
      purposes: {
        more: '+{{count}} more',
        title: 'Consent purposes',
        hint: 'Showing all purposes of the consent',
      },
      headers: {
        consentId: 'Consent ID',
        type: 'Type',
        status: 'Status',
        purposes: 'Purposes',
        updated: 'Updated',
        expiration: 'Expiration',
        actions: 'Actions',
      },
    },
  },
  catalog: {
    actions: {
      addElement: 'Add element',
      addProperty: 'Add property',
      cancel: 'Cancel',
      clear: 'Clear',
      create: 'Create',
      delete: 'Delete',
      deleting: 'Deleting...',
      deleteVersion: 'Delete version',
      removeElement: 'Remove element',
      removeProperty: 'Remove property',
      saving: 'Saving...',
    },
    fields: {
      actions: 'Actions',
      created: 'Created',
      description: 'Description',
      displayName: 'Display name',
      element: 'Element',
      elementId: 'Element ID',
      elementName: 'Element name',
      elementNamespace: 'Element namespace',
      elements: 'Elements',
      elementVersion: 'Element version',
      groupId: 'Group ID',
      groupIds: 'Group IDs',
      mandatory: 'Mandatory',
      name: 'Name',
      namespace: 'Namespace',
      properties: 'Properties',
      propertyKey: 'Key',
      propertyValue: 'Value',
      purposeId: 'Purpose ID',
      purposeName: 'Purpose name',
      purposeVersion: 'Purpose version',
      requirement: 'Requirement',
      schema: 'Schema',
      type: 'Type',
      version: 'Version',
    },
    help: {
      defaultNamespace: 'Uses the default namespace when empty',
      organizationPurpose: 'Leave empty to create an organization-level purpose',
    },
    values: {
      all: 'All',
      mandatory: 'Mandatory',
      optional: 'Optional',
    },
    elements: {
      add: 'Add element',
      back: 'Back to elements',
      createTitle: 'Create element',
      empty: 'No elements match the selected filters.',
      loadFailed: 'Unable to load elements right now.',
      newVersion: 'Create new version',
      tableLabel: 'Consent elements',
      title: 'Elements',
    },
    purposes: {
      add: 'Add purpose',
      back: 'Back to purposes',
      createTitle: 'Create purpose',
      empty: 'No purposes match the selected filters.',
      loadFailed: 'Unable to load purposes right now.',
      newVersion: 'Create new version',
      tableLabel: 'Consent purposes',
      title: 'Purposes',
    },
    details: {
      definition: 'Definition',
      elements: 'Elements',
      overview: 'Overview',
      versions: 'Version history',
    },
    messages: {
      createElementFirst: 'Create an element before defining a purpose.',
      immutableElement:
        '{{namespace}}:{{name}} remains a {{type}} element. Identity fields cannot change between versions.',
      immutablePurpose:
        '{{name}} remains owned by {{groupId}}. Identity fields cannot change between versions.',
      loadingElements: 'Loading available elements...',
      noProperties: 'No custom properties.',
    },
    validation: {
      duplicateElements: 'Each element can only be included once.',
      elementRequired: 'Select at least one element.',
      nameRequired: 'Name is required.',
      schemaRequired: 'Schema is required for JSON and XML elements.',
    },
    delete: {
      title: 'Delete version',
      message: 'Delete version {{version}}?',
      warning:
        'This cannot be undone. Referenced versions cannot be deleted, and deleting the final version deletes the entire entry.',
    },
  },
} as const

export default commonEn
