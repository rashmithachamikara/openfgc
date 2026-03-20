---
name: Docs and Review Process
description: Documentation standards and code review checklist.
applyTo: "**/*.{md,ts,tsx}"
---

# Docs and Review Process

- For new modules/components, include purpose and usage notes.
- Document non-obvious props, edge cases, and accessibility behavior.
- Keep README and setup docs in sync with scripts and tooling.
- Before merge, ensure lint, tests, and build pass.
- Remove dead code and debug logs before PR.
- Verify no hardcoded URLs, secrets, or environment-specific assumptions.
- Use clear PR descriptions with test evidence and impact summary.
