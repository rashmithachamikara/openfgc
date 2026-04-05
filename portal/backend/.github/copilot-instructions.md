---
applyTo: '**'
---

# OpenFGC BFF Copilot Instructions

Also follow `AGENTS.md` in this folder.

## Development Rules

- Use Go `net/http` + `ServeMux`.
- Keep handlers simple; push logic into internal packages.
- Add tests with every functional change.
- Avoid adding third-party packages without clear justification.
- Do not expose secrets or token contents in logs.

## Structure

- Entry point: `cmd/server/main.go`
- App modules under `internal/*`
- Unit tests in `tests/unit`
- Integration tests in `tests/integration`

## Pre-Commit Checks

- `task fmt`
- `task lint`
- `task test`
