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
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { UserMenu } from '@wso2/oxygen-ui'
import { useTranslation } from 'react-i18next'
import { usePortalAuth } from '../../../auth/PortalAuthContext'

type UserClaims = Record<string, unknown>

function asUserClaims(user: unknown): UserClaims {
  return user && typeof user === 'object' ? (user as UserClaims) : {}
}

function claim(claims: UserClaims, name: string): string | undefined {
  const value = claims[name]

  return typeof value === 'string' && value.trim() ? value : undefined
}

function displayName(claims: UserClaims, fallback: string): string {
  const name = claim(claims, 'name') ?? claim(claims, 'displayName')

  if (name) {
    return name
  }

  const givenName = claim(claims, 'given_name')
  const familyName = claim(claims, 'family_name')
  const fullName = [givenName, familyName].filter(Boolean).join(' ')

  return fullName || claim(claims, 'preferred_username') || claim(claims, 'username') || fallback
}

function UserProfileMenu(): React.JSX.Element {
  const { t } = useTranslation('common')
  const auth = usePortalAuth()
  const claims = asUserClaims(auth.user)
  const name = displayName(claims, t('layout.userMenu.unknownUser'))
  const email = claim(claims, 'email') ?? claim(claims, 'sub') ?? t('layout.userMenu.noEmail')
  const avatar = claim(claims, 'picture')

  return (
    <UserMenu>
      <UserMenu.Trigger name={name} avatar={avatar} />
      <UserMenu.Header name={name} email={email} avatar={avatar} />
      <UserMenu.Divider />
      <UserMenu.Logout
        label={t('layout.userMenu.signOut')}
        onClick={() => {
          auth.signOut().catch(() => undefined)
        }}
      />
    </UserMenu>
  )
}

export default UserProfileMenu
