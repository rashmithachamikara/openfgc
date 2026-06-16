/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:9091';
const orgId = __ENV.ORG_ID || 'openfgc-perf-org';
const groupPrefix = __ENV.GROUP_ID || 'perf-group-001';
const purposeName = __ENV.PURPOSE_NAME || 'perf-account-access';
const elementName = __ENV.ELEMENT_NAME || 'perf-account-id';

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
    const groupId = `${groupPrefix}-${String(randomInt(0, 99)).padStart(3, '0')}`;
    const paths = [
        `/api/v1/consents?statuses=ACTIVE&limit=25&offset=0`,
        `/api/v1/consents?groupIds=${encodeURIComponent(groupId)}&limit=25&offset=0`,
        `/api/v1/consents?purposeName=${encodeURIComponent(purposeName)}&limit=25&offset=0`,
        `/api/v1/consents?elementName=${encodeURIComponent(elementName)}&elementNamespace=default&limit=25&offset=0`,
        `/api/v1/consents/attributes?key=segment`,
        `/api/v1/consents/attributes?key=channel&value=web`,
    ];

    const path = paths[randomInt(0, paths.length - 1)];
    const res = http.get(`${baseUrl}${path}`, { headers });
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

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function textSummary(name, data) {
    const duration = data.metrics.http_req_duration.values;
    const failed = data.metrics.http_req_failed.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    return `${name}: p50=${duration.med}ms p95=${duration['p(95)']}ms p99=${duration['p(99)']}ms throughput=${rps}/s error_rate=${failed}\n`;
}
