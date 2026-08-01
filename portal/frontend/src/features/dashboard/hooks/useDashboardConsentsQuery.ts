/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import type { ConsentDetailAPI } from '../../../types/consent'
import { fetchMyConsents } from '../../consent-registry/api/consentsApi'

const DASHBOARD_PAGE_SIZE = 100

async function fetchConsentPage(
  offset: number,
  collected: ConsentDetailAPI[],
): Promise<ConsentDetailAPI[]> {
  const response = await fetchMyConsents({
    limit: DASHBOARD_PAGE_SIZE,
    offset,
  })
  const consents = [...collected, ...response.data]
  const received = response.metadata.count || response.data.length
  const nextOffset = offset + received

  if (received === 0 || nextOffset >= response.metadata.total) {
    return consents
  }

  return fetchConsentPage(nextOffset, consents)
}

async function fetchAllMyConsents(): Promise<ConsentDetailAPI[]> {
  return fetchConsentPage(0, [])
}

export default function useDashboardConsentsQuery(): UseQueryResult<ConsentDetailAPI[]> {
  return useQuery({
    queryKey: ['consents', 'dashboard'],
    queryFn: fetchAllMyConsents,
  })
}
