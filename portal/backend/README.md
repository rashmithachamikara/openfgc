# OpenFGC Portal Backend (BFF)

Stateless backend-for-frontend (BFF) for OpenFGC Portal, responsible for handling portal-facing authentication flows and securely proxying API requests from `portal/frontend` to `/consent-server`.

## Commands

- `task fmt`
- `task fmt:check` (no edits. check only)
- `task lint`
- `task lint:install` (optional, installs golangci-lint to GOPATH/bin)
- `task test`
- `task build`
- `task run`

Install Task if needed: https://taskfile.dev/installation/

## Configuration

- Primary source: `BFF_` environment variables
- Optional file overlay: set `BFF_CONFIG_FILE` to a YAML config file path
- Final effective config is: defaults < file < env

## Health endpoints

- `GET /health`
- `GET /health/liveness`
- `GET /health/readiness`

## AI Instructions

This repository uses VS Code Copilot instruction files to keep AI-generated changes aligned with project and organization standards.

- Backend standards: `portal/backend/AGENTS.md`
- Copilot workspace entrypoint (repo root): `.github/copilot-instructions.md`
- Scoped instructions folder (repo root): `.github/instructions/`
- Backend scope mapping: `portal/backend/**` -> `.github/instructions/portal-backend.instructions.md`

Copilot instructions are discovered automatically and scoped using `applyTo` patterns.
