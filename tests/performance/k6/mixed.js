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
const consentCount = Number(__ENV.CONSENT_COUNT || '1000000');

export const options = {
    vus: Number(__ENV.VUS || '30'),
    duration: __ENV.DURATION || '10m',
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.02'],
    },
};

export default function () {
    const roll = Math.random();
    if (roll < 0.4) {
        readConsent();
    } else if (roll < 0.8) {
        searchConsent();
    } else if (roll < 0.95) {
        validateConsent();
    } else {
        createConsent();
    }
}

export function handleSummary(data) {
    return {
        'tests/performance/reports/mixed-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary('mixed', data),
    };
}

function readConsent() {
    const n = randomInt(1, consentCount);
    const res = http.get(`${baseUrl}/api/v1/consents/${deterministicID(0xc0, n)}`, {
        headers: { 'org-id': orgId },
    });
    check(res, { 'mixed read returns 200': (r) => r.status === 200 });
}

function searchConsent() {
    const headers = { 'org-id': orgId };
    const groupId = `${groupPrefix}-${String(randomInt(0, 99)).padStart(3, '0')}`;
    const paths = [
        `/api/v1/consents?statuses=ACTIVE&limit=25&offset=0`,
        `/api/v1/consents?groupIds=${encodeURIComponent(groupId)}&limit=25&offset=0`,
        `/api/v1/consents?purposeName=${encodeURIComponent(purposeName)}&limit=25&offset=0`,
        `/api/v1/consents/attributes?key=channel&value=web`,
    ];
    const res = http.get(`${baseUrl}${paths[randomInt(0, paths.length - 1)]}`, { headers });
    check(res, { 'mixed search returns 200': (r) => r.status === 200 });
}

function validateConsent() {
    const n = randomInt(1, consentCount);
    const body = JSON.stringify({
        consentId: deterministicID(0xc0, n),
        groupId: `${groupPrefix}-${String((n - 1) % 100).padStart(3, '0')}`,
        userId: `perf-user-${String(n).padStart(9, '0')}`,
    });
    const res = http.post(`${baseUrl}/api/v1/consents/validate`, body, {
        headers: { 'org-id': orgId, 'Content-Type': 'application/json' },
    });
    check(res, { 'mixed validate returns 200': (r) => r.status === 200 });
}

function createConsent() {
    const n = Date.now() * 1000 + __ITER;
    const groupId = `${groupPrefix}-writes`;
    const body = JSON.stringify({
        type: 'accounts',
        expirationTime: Date.now() + 31536000000,
        attributes: {
            segment: 'write',
            channel: 'k6',
            perf_index: `write-${n}`,
        },
        purposes: [{
            name: purposeName,
            elements: [{
                name: elementName,
                namespace: 'default',
                approved: true,
                value: `ACC-WRITE-${n}`,
            }],
        }],
        authorizations: [{
            userId: `perf-write-user-${n}`,
            type: 'primary',
            status: 'APPROVED',
            resources: ['accounts'],
        }],
    });
    const res = http.post(`${baseUrl}/api/v1/consents`, body, {
        headers: { 'org-id': orgId, 'group-id': groupId, 'Content-Type': 'application/json' },
    });
    check(res, { 'mixed write creates consent': (r) => r.status === 201 || r.status === 200 });
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
