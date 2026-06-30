/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

import http from 'k6/http';
import { check } from 'k6';
import { baseUrl, consentCount, deterministicID, orgId, pickReadConsentReference, randomInt, requestParams, textSummary } from './common.js';

export const options = {
    vus: Number(__ENV.VUS || '25'),
    duration: __ENV.DURATION || '5m',
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const seeded = pickReadConsentReference();
    const consentId = seeded ? seeded.consentId : deterministicID(0xc0, randomInt(1, consentCount));
    const res = http.get(`${baseUrl}/api/v1/consents/${consentId}`, requestParams('GET /api/v1/consents/:id', { 'org-id': orgId }));
    check(res, {
        'consent read returns 200': (r) => r.status === 200,
    });
}

export function handleSummary(data) {
    return {
        'tests/performance/reports/read-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary('read', data),
    };
}
