/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

export interface ContentSecurityPolicyOptions {
  apiBaseURL: string
  includeFrameAncestors?: boolean
  upgradeInsecureRequests?: boolean
}

function httpOrigin(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use the http or https scheme.')
  }
  return url.origin
}

/** Builds the production portal CSP from exact deployment origins. */
export function contentSecurityPolicy(options: ContentSecurityPolicyOptions): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    // Oxygen UI uses Emotion to create runtime style elements. Replace this
    // exception with a style nonce when the static host supports per-request HTML.
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${httpOrigin(options.apiBaseURL)}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
  ]

  if (options.includeFrameAncestors !== false) {
    directives.push("frame-ancestors 'none'")
  }
  if (options.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests')
  }

  return `${directives.join('; ')};`
}

/** Renders a deployment artifact understood by static hosts supporting `_headers`. */
export function staticHeadersFile(policy: string): string {
  return [
    '/*',
    `  Content-Security-Policy: ${policy}`,
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), geolocation=(), microphone=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '',
    '/index.html',
    '  Cache-Control: no-cache',
    '',
  ].join('\n')
}
