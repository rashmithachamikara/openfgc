# OpenFGC Portal Agent Guide

This is the cross-agent, provider-neutral instruction file for this repository.

## Instruction Sources

- Project-wide Copilot defaults: .github/copilot-instructions.md
- Scoped rules by domain: .github/instructions/*.instructions.md

Use this file as the canonical shared policy. Use provider-specific files for tool-specific behavior.

## Required Stack and Patterns

- React + TypeScript + Vite
- pnpm for package management
- Oxygen UI for UI components
- Vitest + React Testing Library for tests
- ESLint + Prettier for code quality

## Non-Negotiable Rules

- Import UI components from @wso2/oxygen-ui only. Do not import from @mui/material.
- Use OxygenUIThemeProvider at app root.
- Use sx with theme tokens. Avoid hardcoded colors/spacing and inline styles.
- Use functional components only.
- Keep components focused and extract reusable logic into hooks.
- Avoid prop drilling; prefer context/state management where appropriate.
- Do not use any. Use unknown or generics.
- Add explicit return types for function signatures.
- Prefer interfaces for object shapes.
- Do not disable ESLint rules to bypass quality checks.

## Naming and Structure

- Components: PascalCase.tsx, one component per file, default export.
- Logic and utils: camelCase.ts.
- Variables/functions: camelCase.
- Interfaces/types: PascalCase.
- Constants: UPPER_SNAKE_CASE.
- Folders: kebab-case.
- Keep code under src/components, src/features, src/hooks, src/types, src/utils, src/__tests__.

## Testing and Quality Gates

- Add tests for components and hooks.
- Keep tests under src/__tests__ using *.test.tsx (or co-located when justified).
- Use PascalCase for test filenames in src/__tests__ (for example, ConsentRegistryModals.test.tsx).
- Test happy path and error path, and mock network requests when needed.
- Before merge, ensure lint, format, test, and build all pass.

## Security and Accessibility Baseline

- Never expose secrets in frontend code.
- Use import.meta.env.VITE_* for client-side config.
- Treat user input as untrusted and sanitize when rendering rich content.
- Prefer semantic HTML and keyboard-accessible interactions.
- Keep contrast and labeling accessible.

## i18n Baseline

- Externalize user-facing strings to i18n resources; avoid hardcoded copy in components.
- Use stable, descriptive translation keys and keep naming patterns consistent.
- Ensure English defaults/fallbacks exist for new keys, use locale-aware formatting (date, time, number, currency), and preserve graceful missing-key behavior.
- Cover i18n updates with tests for translated rendering and fallback paths.

## Oxygen UI Notes

The generated Oxygen-specific catalog and examples are maintained in:

- .ai/oxygen-ui/AGENTS.md

Keep that file as framework reference. Keep this file focused on project standards.
