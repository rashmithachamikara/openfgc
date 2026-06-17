/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

import http from 'k6/http';
import { check } from 'k6';
import {
    baseUrl,
    groupCount,
    groupIdFor,
    manifest,
    orgId,
    randomAttributeQuery,
    randomElement,
    randomInt,
    randomPurposeName,
    requestParams,
    textSummary,
} from './common.js';

export const options = {
    vus: Number(__ENV.VUS || '20'),
    duration: __ENV.DURATION || '5m',
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.02'],
    },
};

export default function () {
    const headers = { 'org-id': orgId };
    const groupId = groupIdFor(randomInt(1, groupCount));
    const purposeName = randomPurposeName();
    const element = randomElement();
    const attributeQuery = randomAttributeQuery();
    const statuses = manifest.searchSamples.statuses || ['ACTIVE', 'CREATED', 'EXPIRED', 'REVOKED'];
    const status = statuses[randomInt(0, statuses.length - 1)];
    const paths = [
        `/api/v1/consents?statuses=${encodeURIComponent(status)}&limit=25&offset=0`,
        `/api/v1/consents?groupIds=${encodeURIComponent(groupId)}&limit=25&offset=0`,
        `/api/v1/consents?purposeName=${encodeURIComponent(purposeName)}&limit=25&offset=0`,
        `/api/v1/consents?elementName=${encodeURIComponent(element.name)}&elementNamespace=${encodeURIComponent(element.namespace)}&limit=25&offset=0`,
        `/api/v1/consents/attributes?key=${encodeURIComponent(attributeQuery.key)}`,
        `/api/v1/consents/attributes?key=${encodeURIComponent(attributeQuery.key)}&value=${encodeURIComponent(attributeQuery.value)}`,
    ];

    const path = paths[randomInt(0, paths.length - 1)];
    const requestName = path.includes('/attributes') ? 'GET /api/v1/consents/attributes' : 'GET /api/v1/consents';
    const res = http.get(`${baseUrl}${path}`, requestParams(requestName, headers));
    check(res, {
        'search returns 200': (r) => r.status === 200,
    });
}

export function handleSummary(data) {
    return {
        'tests/performance/reports/search-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary('search', data),
    };
}
