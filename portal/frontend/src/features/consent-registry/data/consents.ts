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

import type { ConsentRecord } from '../../../types/consent'

export const CONSENT_REGISTRY_MOCK_DATA: ConsentRecord[] = [
  {
    id: 'CON-8291',
    clientName: 'Tesco_Bank_v1',
    type: 'Accounts',
    status: 'ACTIVE',
    purposes: ['Marketing', 'Analytics'],
    updatedAt: '2023-10-24T14:22:00Z',
    expirationTime: 1766383796,
    canRevoke: true,
    canApprove: false,
  },
  {
    id: 'CON-4321',
    clientName: 'Tesco_Bank_v1',
    type: 'Accounts',
    status: 'EXPIRED',
    purposes: ['Marketing'],
    updatedAt: '2023-10-20T16:30:00Z',
    expirationTime: 1766383796,
    canRevoke: false,
    canApprove: false,
  },
  {
    id: 'CON-9012',
    clientName: 'Tesco_Bank_v1',
    type: 'Payments',
    status: 'ACTIVE',
    purposes: ['Recurring Payments'],
    updatedAt: '2023-10-25T10:15:00Z',
    expirationTime: 0,
    canRevoke: true,
    canApprove: false,
  },
  {
    id: 'CON-7120',
    clientName: 'Amazon_Retail',
    type: 'Payments',
    status: 'CREATED',
    purposes: ['Transactions'],
    updatedAt: '2023-10-23T09:15:00Z',
    expirationTime: 1766383796,
    canRevoke: false,
    canApprove: true,
  },
  {
    id: 'CON-6552',
    clientName: 'Mobile_App_IOS',
    type: 'Accounts',
    status: 'REVOKED',
    purposes: ['Full Access'],
    updatedAt: '2023-10-22T11:45:00Z',
    expirationTime: 1766383796,
    canRevoke: false,
    canApprove: false,
  },
  {
    id: 'CON-1122',
    clientName: 'Fintech_Global_App',
    type: 'Identity',
    status: 'ACTIVE',
    purposes: ['KYC Verification'],
    updatedAt: '2023-10-26T08:30:00Z',
    expirationTime: 0,
    canRevoke: true,
    canApprove: false,
  },
  {
    id: 'CON-3344',
    clientName: 'Fintech_Global_App',
    type: 'Payments',
    status: 'CREATED',
    purposes: ['Investment Transfers'],
    updatedAt: '2023-10-26T12:45:00Z',
    expirationTime: 1766383796,
    canRevoke: false,
    canApprove: true,
  },
]
