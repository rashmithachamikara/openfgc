# Frontend dependency risk acceptance

Recorded: 2026-07-29  
Review by: 2026-10-27

## Current audit status

After upgrading all safely compatible patched dependencies:

- `pnpm audit` reports three high-severity vulnerability instances across two advisories.
- `pnpm audit --prod` reports one high-severity advisory.
- No critical, moderate, or low-severity findings remain.

## GHSA-qwww-vcr4-c8h2 — React Router RSC CSRF

- Affected dependency: `react-router@7.18.2`, through `react-router-dom@7.18.2`.
- Available remediation: `react-router@8.3.0`.
- Applicability: Not applicable to the current application architecture. The advisory states that
  it affects applications using unstable React Server Components APIs. This frontend is a
  client-rendered Vite SPA and does not use React Server Components or React Router server actions.
- Reason upgrade is deferred: A matching stable `react-router-dom@8.3.0` release is not currently
  published. Overriding its internal `react-router` dependency across a major version is not a
  supported or safe remediation.
- Remediation trigger: Upgrade the React Router packages together when compatible stable releases
  are available, or reassess immediately if the application adopts RSC APIs or server actions.
- CI enforcement: `pnpm security:audit` accepts only this advisory on the exact
  `react-router-dom > react-router` dependency path and continues to fail for every other high or
  critical production advisory.

## GHSA-mh99-v99m-4gvg / CVE-2026-14257 — brace-expansion memory exhaustion

- Affected dependencies: `brace-expansion@1.1.16` through ESLint tooling and
  `brace-expansion@2.1.2` through Vitest coverage tooling.
- Available remediation: `brace-expansion@5.0.8`.
- Exposure: These paths originate from declared development tools and are absent from
  `pnpm audit --prod`. They are not included in the production browser application.
- Reason upgrade is deferred: The patched release is an ESM-only major version. Forcing it into
  consumers that require the 1.x or 2.x APIs may break linting and test tooling.
- Compensating control: Do not pass attacker-controlled glob or brace patterns to lint, test, or
  coverage commands.
- Remediation trigger: Remove this exception when ESLint, Vitest, or their transitive dependencies
  adopt a compatible patched release.

## Review requirements

Re-run `pnpm audit` and `pnpm audit --prod` during dependency updates and at the review date above.
Reassess this acceptance earlier if dependency paths, application rendering architecture, or CI
input trust boundaries change.
