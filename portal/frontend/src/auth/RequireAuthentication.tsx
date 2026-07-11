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

import { useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { usePortalAuth } from './PortalAuthContext'

function hasPendingOAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search)

  return params.has('code') || params.has('state') || params.has('error')
}

export default function RequireAuthentication({ children }: PropsWithChildren): React.JSX.Element {
  const auth = usePortalAuth()
  const hasStartedSignIn = useRef(false)
  const isProcessingOAuthCallback = hasPendingOAuthCallback()

  useEffect(() => {
    if (
      !auth.isInitialized ||
      auth.isLoading ||
      auth.isAuthenticated ||
      isProcessingOAuthCallback ||
      hasStartedSignIn.current
    ) {
      return
    }

    hasStartedSignIn.current = true
    void auth.signIn()
  }, [auth, isProcessingOAuthCallback])

  if (!auth.isInitialized || auth.isLoading || isProcessingOAuthCallback || !auth.isAuthenticated) {
    return <main aria-busy="true">Loading authentication…</main>
  }

  return <>{children}</>
}
