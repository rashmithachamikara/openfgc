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
const consentCount = Number(__ENV.CONSENT_COUNT || '1000000');

export const options = {
    vus: Number(__ENV.VUS || '20'),
    duration: __ENV.DURATION || '5m',
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const n = pickValidationIndex();
    const body = JSON.stringify({
        consentId: deterministicID(0xc0, n),
        groupId: `${groupPrefix}-${String((n - 1) % 100).padStart(3, '0')}`,
        userId: `perf-user-${String(n).padStart(9, '0')}`,
    });
    const res = http.post(`${baseUrl}/api/v1/consents/validate`, body, {
        headers: { 'org-id': orgId, 'Content-Type': 'application/json' },
    });
    check(res, {
        'validate returns 200': (r) => r.status === 200,
        'validate returns boolean result': (r) => typeof r.json('isValid') === 'boolean',
    });
}

export function handleSummary(data) {
    return {
        'tests/performance/reports/validate-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary('validate', data),
    };
}

function pickValidationIndex() {
    const anchors = [3, 1, 2, 10];
    if (Math.random() < 0.4) {
        return anchors[randomInt(0, anchors.length - 1)];
    }
    return randomInt(1, consentCount);
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
