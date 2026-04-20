# OpenFGC BFF Agent Guide

This is the shared agent policy for `portal/backend`.

## Scope

- Go backend only (`portal/backend/**`)
- Stateless BFF architecture with OIDC/auth proxy responsibilities

## Core Rules

- Prefer Go standard library where practical.
- Keep handlers thin; business logic in services.
- Keep security-sensitive logic explicit and test-covered.
- Never log tokens, secrets, or key material.
- Keep middleware composable and order-aware.

## Naming and Structure

- `cmd/server`: entrypoint and service wiring
- `internal/auth`: auth and token logic
- `internal/proxy`: proxy behavior
- `internal/middleware`: middleware chain
- `internal/config`: configuration loading and validation
- `tests/unit` and `tests/integration`: layered tests

## Quality Gates

- Run `task fmt`, `task lint`, and `task test` before merge.
- New behavior should include unit or integration coverage.

## Security Baseline

- Enforce strict cookie attributes and CSRF checks.
- Treat client-supplied tenant/client headers as untrusted.
- Fail closed on parsing/validation errors.
