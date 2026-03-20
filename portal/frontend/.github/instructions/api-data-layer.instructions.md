---
name: API and Data Layer Rules
description: API client, caching, and server-state conventions.
applyTo: "src/**/*.{ts,tsx}"
---

# API and Data Layer Rules

- Use `fetch` for HTTP requests.
- For server state, prefer TanStack Query patterns (query keys, retries, stale time).
- Keep API access in dedicated modules/hooks, not inside presentational components.
- Define typed request/response contracts for all endpoints.
- Handle loading, empty, error, and success states explicitly.
- Centralize error mapping for consistent user-facing messages.
- Use cancellation/abort patterns where appropriate.
