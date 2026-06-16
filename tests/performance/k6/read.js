/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:9091';
const orgId = __ENV.ORG_ID || 'openfgc-perf-org';
const consentCount = Number(__ENV.CONSENT_COUNT || '1000000');

export const options = {
    vus: Number(__ENV.VUS || '25'),
    duration: __ENV.DURATION || '5m',
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const n = randomInt(1, consentCount);
    const consentId = deterministicID(0xc0, n);
    const res = http.get(`${baseUrl}/api/v1/consents/${consentId}`, {
        headers: { 'org-id': orgId },
    });
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

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
