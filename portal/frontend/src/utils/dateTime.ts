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

const EMPTY_DATE_PLACEHOLDER = '-'

export function formatEpochSeconds(
  epochInSeconds: number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
): string {
  if (epochInSeconds == null || !Number.isFinite(epochInSeconds)) {
    return EMPTY_DATE_PLACEHOLDER
  }

  return new Date(epochInSeconds * 1000).toLocaleString(locales, options)
}

export function formatIsoDateTime(
  dateTimeText: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
): string {
  if (!dateTimeText) {
    return EMPTY_DATE_PLACEHOLDER
  }

  const parsedDate = new Date(dateTimeText)

  if (Number.isNaN(parsedDate.getTime())) {
    return EMPTY_DATE_PLACEHOLDER
  }

  return parsedDate.toLocaleString(locales, options)
}
