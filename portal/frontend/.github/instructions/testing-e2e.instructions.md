---
name: Testing and E2E Rules
description: Unit/integration testing and end-to-end testing standards.
applyTo: '**/*.{test,spec}.{ts,tsx}'
---

# Testing and E2E Rules

- Use Vitest + React Testing Library for unit and integration tests.
- Prefer behavior-driven tests over implementation details.
- Cover happy path and error path for components/hooks.
- Mock network requests in unit tests.
- Keep tests deterministic; avoid timing flakiness.
- For critical user flows, add/maintain Playwright E2E tests under `e2e/`.
- Follow Arrange-Act-Assert structure and clear test names.
