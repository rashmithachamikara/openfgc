/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

import http from 'k6/http';
import { check } from 'k6';
import {
    baseUrl,
    orgId,
    deterministicID,
    findActiveConsentIndex,
    firstPurposeNameFor,
    firstElementForPurpose,
    groupIdFor,
    groupIndexFor,
    pickValidationConsentReference,
    requestParams,
    selectUserId,
    textSummary,
} from './common.js';

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
    const activeSeed = pickValidationConsentReference(true);
    const activeIndex = findActiveConsentIndex();
    const consentId = activeSeed ? activeSeed.consentId : deterministicID(0xc0, activeIndex);
    const consentType = activeSeed ? activeSeed.consentType : 'accounts';
    const groupIndex = activeSeed ? null : groupIndexFor(activeIndex);
    const groupId = activeSeed ? activeSeed.groupId : groupIdFor(groupIndex);
    const userId = activeSeed ? activeSeed.userId : selectUserId(activeIndex, consentType, groupIndex, 0);
    const purposeName = firstPurposeNameFor(consentType);
    const element = firstElementForPurpose(purposeName);
    const headers = { 'org-id': orgId, 'Content-Type': 'application/json' };

    check(http.get(`${baseUrl}/health`, requestParams('GET /health')), {
        'health is up': (res) => res.status === 200 && res.body.includes('UP'),
    });

    check(http.get(`${baseUrl}/api/v1/consents/${consentId}`, requestParams('GET /api/v1/consents/:id', { 'org-id': orgId })), {
        'known consent is readable': (res) => res.status === 200,
    });

    check(http.get(`${baseUrl}/api/v1/consents?limit=10&offset=0`, requestParams('GET /api/v1/consents', { 'org-id': orgId })), {
        'first page is readable': (res) => res.status === 200,
    });

    const validateBody = JSON.stringify({
        consentId,
        groupId,
        userId,
    });
    check(http.post(`${baseUrl}/api/v1/consents/validate`, validateBody, requestParams('POST /api/v1/consents/validate', headers)), {
        'known active consent validates': (res) => res.status === 200 && res.json('isValid') === true,
    });

    const createBody = JSON.stringify({
        type: consentType,
        expirationTime: Date.now() + 31536000000,
        attributes: {
            segment: 'retail',
            channel: 'web',
            region: 'region-01',
            customer_tier: 'standard',
            product_line: 'savings',
            service_plan: 'core',
            risk_band: 'low',
            perf_index: `smoke-${Date.now()}`,
        },
        purposes: [{
            name: purposeName,
            elements: [{
                name: element.name,
                namespace: element.namespace,
                approved: true,
                value: `SMOKE-${Date.now()}`,
            }],
        }],
        authorizations: [{
            userId: `smoke-user-${Date.now()}`,
            type: 'primary',
            status: 'APPROVED',
            resources: ['accounts'],
        }],
    });
    check(http.post(`${baseUrl}/api/v1/consents`, createBody, requestParams('POST /api/v1/consents', { ...headers, 'group-id': groupId })), {
        'smoke create works': (res) => res.status === 200 || res.status === 201,
    });
}

export function handleSummary(data) {
    return {
        'tests/performance/reports/smoke-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary('smoke', data),
    };
}
