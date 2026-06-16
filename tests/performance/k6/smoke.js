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

export const options = {
    vus: 1,
    iterations: 1,
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1000'],
    },
};

export default function () {
    const consentId = deterministicID(0xc0, 3);
    const headers = { 'org-id': orgId, 'Content-Type': 'application/json' };

    check(http.get(`${baseUrl}/health`), {
        'health is up': (res) => res.status === 200 && res.body.includes('UP'),
    });

    check(http.get(`${baseUrl}/api/v1/consents/${consentId}`, { headers }), {
        'known consent is readable': (res) => res.status === 200,
    });

    check(http.get(`${baseUrl}/api/v1/consents?limit=10&offset=0`, { headers }), {
        'first page is readable': (res) => res.status === 200,
    });

    const validateBody = JSON.stringify({
        consentId,
        groupId: `${groupPrefix}-002`,
        userId: 'perf-user-000000003',
    });
    check(http.post(`${baseUrl}/api/v1/consents/validate`, validateBody, { headers }), {
        'known active consent validates': (res) => res.status === 200 && res.json('isValid') === true,
    });
}

export function handleSummary(data) {
    return {
        'tests/performance/reports/smoke-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary('smoke', data),
    };
}

function deterministicID(kind, n) {
    const hex = (value, width) => value.toString(16).padStart(width, '0');
    return `${hex(kind, 8)}-${hex(Math.floor(n / 0x100000000) & 0xffff, 4)}-${hex(Math.floor(n / 0x10000) & 0xffff, 4)}-${hex(n & 0xffff, 4)}-${hex(n, 12)}`;
}

function textSummary(name, data) {
    const duration = data.metrics.http_req_duration.values;
    const failed = data.metrics.http_req_failed.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    return `${name}: p50=${duration.med}ms p95=${duration['p(95)']}ms p99=${duration['p(99)']}ms throughput=${rps}/s error_rate=${failed}\n`;
}
