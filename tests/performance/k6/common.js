/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * Licensed under the Apache License, Version 2.0.
 */

const manifestText = JSON.parse(open('../seed/templates.json'));

export const manifest = manifestText;
export const baseUrl = __ENV.BASE_URL || manifest.baseUrl || 'http://localhost:9091';
export const orgId = __ENV.ORG_ID || manifest.orgId || 'openfgc-perf-org';
export const consentCount = Number(__ENV.CONSENT_COUNT || String(manifest.seededCount || 1000000));
export const groupPrefix = __ENV.GROUP_PREFIX || manifest.groupModel.prefix || 'perf-group';
export const groupCount = effectiveGroupCount(consentCount);
export const enabledGroupCount = Math.min(groupCount, manifest.groupModel.purposeEnabledGroupCount || 120);
export const createDefaults = manifest.createDefaults || {};
export const seedMode = manifest.seedMode || 'db';
export const seedSamples = Array.isArray(manifest.seedSamples) ? manifest.seedSamples : [];
const activeSeedSamples = seedSamples.filter((item) => item.status === 'ACTIVE');

export function loadJson(path) {
    return JSON.parse(open(path));
}

export function deterministicID(kind, n) {
    const hex = (value, width) => value.toString(16).padStart(width, '0');
    return `${hex(kind, 8)}-${hex(Math.floor(n / 0x100000000) & 0xffff, 4)}-${hex(Math.floor(n / 0x10000) & 0xffff, 4)}-${hex(n & 0xffff, 4)}-${hex(n, 12)}`;
}

export function effectiveGroupCount(totalConsents) {
    const minGroups = manifest.groupModel.minGroupCount || 100;
    const maxGroups = manifest.groupModel.maxGroupCount || 1000;
    return Math.min(maxGroups, Math.max(minGroups, Math.floor(totalConsents / 1000) || minGroups));
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function hashModulo(n, salt, modulo) {
    if (modulo <= 1) {
        return 0;
    }
    let x = BigInt(n) + BigInt(salt) * 0x9e3779b97f4a7c15n;
    x ^= x >> 33n;
    x *= 0xff51afd7ed558ccdn;
    x ^= x >> 33n;
    x *= 0xc4ceb9fe1a85ec53n;
    x ^= x >> 33n;
    return Number(x % BigInt(modulo));
}

export function groupIndexFor(n) {
    if (groupCount <= 1) {
        return 1;
    }
    const topCount = Math.max(1, Math.round(groupCount * 0.05));
    let midCount = Math.max(1, Math.round(groupCount * 0.20));
    if (topCount + midCount >= groupCount) {
        midCount = Math.max(1, groupCount - topCount - 1);
    }
    const tailCount = Math.max(1, groupCount - topCount - midCount);
    const selector = hashModulo(n, 41, 100);
    if (selector < 40) {
        return 1 + hashModulo(n, 43, topCount);
    }
    if (selector < 75) {
        return 1 + topCount + hashModulo(n, 47, midCount);
    }
    return 1 + topCount + midCount + hashModulo(n, 53, tailCount);
}

export function groupIdFor(index) {
    return `${groupPrefix}-${String(index).padStart(4, '0')}`;
}

export function statusFor(n) {
    const weighted = sortedWeighted(manifest.distributions.status);
    return chooseWeighted(weighted, n, 23);
}

export function consentTypeFor(n) {
    const weighted = manifest.consentTypes.map((item) => ({ name: item.name, weight: item.weight }));
    return chooseWeighted(weighted, n, 11);
}

export function authCountFor(n) {
    const weighted = sortedWeighted(manifest.distributions.authorizationCount);
    return Number(chooseWeighted(weighted, n, 37));
}

export function selectUserId(n, consentType, groupIndex, slot) {
    const totalUsers = Math.max(groupCount * 20, Math.round(consentCount * (manifest.distributions.userPopulationRatio || 0.22)));
    const topUsers = alignedBucketSize(totalUsers, groupCount, 0.05);
    let midUsers = alignedBucketSize(totalUsers, groupCount, 0.20);
    if (topUsers + midUsers >= totalUsers) {
        midUsers = Math.max(groupCount, totalUsers - topUsers - groupCount);
    }
    const tailUsers = Math.max(groupCount, totalUsers - topUsers - midUsers);
    const selector = hashModulo(n + slot, 131 + slot * 3, 100);
    let bucketStart = 0;
    let bucketSize = topUsers;
    if (selector < 45) {
        bucketStart = 0;
        bucketSize = topUsers;
    } else if (selector < 80) {
        bucketStart = topUsers;
        bucketSize = midUsers;
    } else {
        bucketStart = topUsers + midUsers;
        bucketSize = tailUsers;
    }
    const groupSlot = consentType === 'profile-sharing' && selector < 45
        ? hashModulo(n, 151 + slot, groupCount)
        : groupIndex - 1;
    const span = Math.max(1, Math.floor(bucketSize / groupCount));
    const offset = hashModulo(n, 149 + slot, span);
    const userIndex = bucketStart + groupSlot + groupCount * offset;
    return `user-${String(userIndex + 1).padStart(9, '0')}`;
}

export function requestParams(name, extraHeaders = {}) {
    return {
        headers: extraHeaders,
        tags: { name },
    };
}

export function pickReadConsentReference() {
    return pickSeedSample(false);
}

export function pickValidationConsentReference(preferActive = false) {
    return pickSeedSample(preferActive);
}

export function findActiveConsentIndex() {
    for (let i = 1; i <= 200; i += 1) {
        if (statusFor(i) === 'ACTIVE') {
            return i;
        }
    }
    return 1;
}

export function firstPurposeNameFor(typeName) {
    const consentType = manifest.consentTypes.find((item) => item.name === typeName);
    return consentType ? consentType.purposeNames[0] : manifest.createDefaults.purposeName;
}

export function firstElementForPurpose(purposeName) {
    const purpose = manifest.purposes.find((item) => item.name === purposeName);
    if (!purpose || !purpose.elements || purpose.elements.length === 0) {
        return {
            name: manifest.createDefaults.elementName,
            namespace: manifest.createDefaults.elementNamespace,
        };
    }
    const basicElement = purpose.elements.find((item) => {
        const elementDef = manifest.elements.find((element) => element.name === item.name && element.namespace === item.namespace);
        return elementDef && elementDef.type === 'basic';
    });
    return basicElement || purpose.elements[0];
}

export function randomPurposeName() {
    return manifest.purposes[randomInt(0, manifest.purposes.length - 1)].name;
}

export function randomElement() {
    const element = manifest.elements[randomInt(0, manifest.elements.length - 1)];
    return { name: element.name, namespace: element.namespace };
}

export function randomAttributeQuery() {
    const keys = Object.keys(manifest.attributes);
    const key = keys[randomInt(0, keys.length - 1)];
    const values = manifest.attributes[key];
    const value = values[randomInt(0, values.length - 1)];
    return { key, value };
}

export function textSummary(name, data) {
    const duration = data.metrics.http_req_duration.values;
    const failed = data.metrics.http_req_failed.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    return `${name}: p50=${duration.med}ms p95=${duration['p(95)']}ms p99=${duration['p(99)']}ms throughput=${rps}/s error_rate=${failed}\n`;
}

function sortedWeighted(weightMap) {
    return Object.keys(weightMap)
        .sort()
        .map((name) => ({ name, weight: weightMap[name] }));
}

function chooseWeighted(choices, n, salt) {
    const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
    const pick = hashModulo(n, salt, total);
    let running = 0;
    for (const choice of choices) {
        running += choice.weight;
        if (pick < running) {
            return choice.name;
        }
    }
    return choices[choices.length - 1].name;
}

function alignedBucketSize(total, groups, ratio) {
    let size = Math.round(total * ratio);
    if (size < groups) {
        size = groups;
    }
    size -= size % groups;
    return size === 0 ? groups : size;
}

function pickSeedSample(preferActive) {
    if (seedMode !== 'api' || seedSamples.length === 0) {
        return null;
    }
    const pool = preferActive && activeSeedSamples.length > 0 ? activeSeedSamples : seedSamples;
    return pool[randomInt(0, pool.length - 1)];
}
