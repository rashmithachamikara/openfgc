---
name: Security Rules
description: Frontend security and safe rendering practices.
applyTo: "src/**/*.{ts,tsx}"
---

# Security Rules

- Never hardcode secrets, tokens, or credentials in code.
- Use only `import.meta.env.VITE_*` for client-side environment variables.
- Use HTTPS endpoints only.
- Treat all user input as untrusted; validate and sanitize before use.
- Avoid `dangerouslySetInnerHTML`; if unavoidable, sanitize with DOMPurify first.
- Do not log sensitive data (tokens, emails, IDs tied to PII).
- Prefer typed API contracts and explicit error handling.
