---
name: Forms and Validation Rules
description: Standards for forms, schemas, and user input validation.
applyTo: "src/**/*.{ts,tsx}"
---

# Forms and Validation Rules

- For new forms, prefer React Hook Form.
- Use Zod schemas for validation and derive form types from schemas.
- Validate at field level and form-submit level.
- Show actionable validation messages near fields.
- Avoid duplicating validation logic across components.
- Keep form state local unless cross-screen persistence is required.
- Sanitize and normalize user input before submit.
