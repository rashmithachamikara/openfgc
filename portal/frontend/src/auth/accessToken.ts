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

export type AccessTokenProvider = () => Promise<string>

let accessTokenProvider: AccessTokenProvider | undefined

/** Registers the SDK-backed token supplier used by the portal API client. */
export function setAccessTokenProvider(provider: AccessTokenProvider): void {
  accessTokenProvider = provider
}

/** Removes the current token supplier when the authentication provider unmounts. */
export function clearAccessTokenProvider(provider: AccessTokenProvider): void {
  if (accessTokenProvider === provider) {
    accessTokenProvider = undefined
  }
}

/** Returns the current SDK-managed access token, when an auth provider is active. */
export async function getAccessToken(): Promise<string | undefined> {
  if (!accessTokenProvider) {
    return undefined
  }

  const token = await accessTokenProvider()
  return token.trim() || undefined
}
