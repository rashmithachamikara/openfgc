/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

import http from 'k6/http';
import { check } from 'k6';
import {
    baseUrl,
    consentTypeFor,
    consentCount,
    createDefaults,
    deterministicID,
    firstElementForPurpose,
    groupCount,
    groupIdFor,
    groupIndexFor,
    manifest,
    orgId,
    pickReadConsentReference,
    pickValidationConsentReference,
    randomAttributeQuery,
    randomElement,
    randomInt,
    randomPurposeName,
    requestParams,
    selectUserId,
    textSummary,
} from './common.js';

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
    const seeded = pickReadConsentReference();
    const consentId = seeded ? seeded.consentId : deterministicID(0xc0, randomInt(1, consentCount));
    const res = http.get(`${baseUrl}/api/v1/consents/${consentId}`, requestParams('GET /api/v1/consents/:id', {
        'org-id': orgId,
    }));
    check(res, { 'mixed read returns 200': (r) => r.status === 200 });
}

function searchConsent() {
    const headers = { 'org-id': orgId };
    const groupId = groupIdFor(randomInt(1, groupCount));
    const purposeName = randomPurposeName();
    const element = randomElement();
    const attributeQuery = randomAttributeQuery();
    const statuses = manifest.searchSamples.statuses || ['ACTIVE', 'CREATED', 'EXPIRED', 'REVOKED'];
    const paths = [
        `/api/v1/consents?statuses=${encodeURIComponent(statuses[randomInt(0, statuses.length - 1)])}&limit=25&offset=0`,
        `/api/v1/consents?groupIds=${encodeURIComponent(groupId)}&limit=25&offset=0`,
        `/api/v1/consents?purposeName=${encodeURIComponent(purposeName)}&limit=25&offset=0`,
        `/api/v1/consents?elementName=${encodeURIComponent(element.name)}&elementNamespace=${encodeURIComponent(element.namespace)}&limit=25&offset=0`,
        `/api/v1/consents/attributes?key=${encodeURIComponent(attributeQuery.key)}&value=${encodeURIComponent(attributeQuery.value)}`,
    ];
    const path = paths[randomInt(0, paths.length - 1)];
    const requestName = path.includes('/attributes') ? 'GET /api/v1/consents/attributes' : 'GET /api/v1/consents';
    const res = http.get(`${baseUrl}${path}`, requestParams(requestName, headers));
    check(res, { 'mixed search returns 200': (r) => r.status === 200 });
}

function validateConsent() {
    const seeded = pickValidationConsentReference(false);
    const n = randomInt(1, consentCount);
    const consentType = seeded ? seeded.consentType : consentTypeFor(n);
    const groupIndex = seeded ? null : groupIndexFor(n);
    const body = JSON.stringify({
        consentId: seeded ? seeded.consentId : deterministicID(0xc0, n),
        groupId: seeded ? seeded.groupId : groupIdFor(groupIndex),
        userId: seeded ? seeded.userId : selectUserId(n, consentType, groupIndex, 0),
    });
    const res = http.post(`${baseUrl}/api/v1/consents/validate`, body, requestParams('POST /api/v1/consents/validate', {
        'org-id': orgId,
        'Content-Type': 'application/json',
    }));
    check(res, { 'mixed validate returns 200': (r) => r.status === 200 });
}

function createConsent() {
    const now = Date.now();
    const purposeName = createDefaults.purposeName || 'account-overview';
    const element = firstElementForPurpose(purposeName);
    const body = JSON.stringify({
        type: createDefaults.consentType || 'accounts',
        expirationTime: now + 31536000000,
        attributes: {
            segment: 'retail',
            channel: 'web',
            region: 'region-01',
            customer_tier: 'standard',
            product_line: 'savings',
            service_plan: 'core',
            risk_band: 'low',
            perf_index: `write-${now}-${__ITER}`,
        },
        purposes: [{
            name: purposeName,
            elements: [{
                name: element.name,
                namespace: element.namespace,
                approved: true,
                value: `WRITE-${now}-${__ITER}`,
            }],
        }],
        authorizations: [{
            userId: `perf-write-user-${now}-${__ITER}`,
            type: 'primary',
            status: 'APPROVED',
            resources: ['accounts'],
        }],
    });
    const res = http.post(`${baseUrl}/api/v1/consents`, body, requestParams('POST /api/v1/consents', {
        'org-id': orgId,
        'group-id': groupIdFor(randomInt(1, Math.max(1, Math.min(groupCount, manifest.groupModel.purposeEnabledGroupCount || 1)))),
        'Content-Type': 'application/json',
    }));
    check(res, { 'mixed write creates consent': (r) => r.status === 201 || r.status === 200 });
}
