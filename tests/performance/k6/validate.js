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
    deterministicID,
    groupIdFor,
    groupIndexFor,
    orgId,
    pickValidationConsentReference,
    randomInt,
    requestParams,
    selectUserId,
    statusFor,
    textSummary,
} from './common.js';

export const options = {
    vus: Number(__ENV.VUS || '20'),
    duration: __ENV.DURATION || '5m',
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const seeded = pickValidationConsentReference(false);
    const n = pickValidationIndex();
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
    if (Math.random() >= 0.35) {
        return randomInt(1, consentCount);
    }
    for (let i = 1; i <= 20; i += 1) {
        if (statusFor(i) === 'ACTIVE') {
            return i;
        }
    }
    return randomInt(1, consentCount);
}
