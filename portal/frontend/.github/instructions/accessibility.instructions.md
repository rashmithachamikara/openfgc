---
name: Accessibility Rules
description: WCAG-focused accessibility rules for UI components.
applyTo: 'src/**/*.{tsx,ts}'
---

# Accessibility Rules

- Use semantic HTML and correct landmark structure.
- Ensure keyboard accessibility for all interactive elements.
- Provide accessible names for controls (`aria-label`, labels, or visible text).
- Use sufficient color contrast and avoid color-only status indicators.
- Ensure focus visibility and predictable tab order.
- Add `aria-*` attributes only when native semantics are insufficient.
- Include accessibility checks in component tests where practical.
