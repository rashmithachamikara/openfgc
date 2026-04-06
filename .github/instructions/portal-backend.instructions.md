---
description: "Use when editing Go BFF backend code under portal/backend, including handlers, router, config, middleware, and tests."
applyTo: "portal/backend/**"
---

# OpenFGC BFF Instructions

Also follow `portal/backend/AGENTS.md`.

## Development Rules

- Use Go `net/http` + `ServeMux`.
- Keep handlers simple; push logic into internal packages.
- Add tests with every functional change.
- Avoid adding third-party packages without clear justification.
- Do not expose secrets or token contents in logs.

## Structure

- Entry point: `portal/backend/cmd/server/main.go`
- App modules under `portal/backend/internal/*`
- Unit tests in `portal/backend/tests/unit`
- Integration tests in `portal/backend/tests/integration`

## Pre-Commit Checks

- `task fmt`
- `task lint`
- `task test`
