---
applyTo: "**"
---

# OpenFGC Portal - Coding Standards

React 19 + TypeScript + Vite project using Oxygen UI (Material-UI v7).

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Package Manager**: pnpm 10.6.5
- **Bundler**: Vite 7.3.1
- **UI Library**: Oxygen UI (import from `@wso2/oxygen-ui` only, never `@mui/material`)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9 + Prettier + Airbnb Styleguide

## Naming Conventions

- **Components**: `PascalCase.tsx` (default export, one per file)
- **Logic/Utils**: `camelCase.ts`
- **Folders**: `kebab-case` (except component folder names)
- **Variables/Functions**: `camelCase`
- **Interfaces/Types**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

## TypeScript Standards

- **No `any` types** — use `unknown` or proper generics
- **Explicit return types** on all function signatures
- **Prefer interfaces** over types for object shapes
- **Use generics** for reusable logic

```typescript
// ✅ CORRECT
interface User {
  id: string
  name: string
}

function getUser(id: string): User {
  // ...
}

// ❌ WRONG
function getUser(id: any): any { ... }
```

## React & Components

- **Functional components only** — no class components
- Keep components **small and single-purpose**
- Extract reusable logic into **custom hooks**
- Use **React.memo/useMemo/useCallback** for performance-critical code
- **Never prop drill** — use context or state management instead
- Avoid inline styles — use `sx` prop with theme tokens

## Oxygen UI Usage

- **Always import from `@wso2/oxygen-ui`**, never `@mui/material`
- Use `OxygenUIThemeProvider` at app root
- Use `sx` prop with **theme tokens** (colors, spacing) — never hardcode values

```typescript
// ✅ CORRECT
import { Button, Box } from '@wso2/oxygen-ui'

<Box sx={{ p: 2, bgcolor: 'background.paper' }}>
  <Button variant="contained">Save</Button>
</Box>

// ❌ WRONG
import { Button } from '@mui/material'
<div style={{ padding: '16px', backgroundColor: '#fff' }} />
```

## Testing Requirements

- **Every component and hook must have tests**
- Tests go in `src/__tests__/` with `*.test.tsx` extension
- Use **React Testing Library** (test user behavior, not implementation)
- Test both **happy path** and **error scenarios**
- Mock network requests

```typescript
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })
})
```

## Project Structure

```
src/
├── components/           # Shared reusable UI components
├── features/             # Feature-level modules (future use)
├── hooks/                # Custom React hooks
├── types/                # TypeScript interfaces & types
├── utils/                # Utility functions & helpers
├── __tests__/            # Tests (*.test.tsx)
├── App.tsx               # Root component
└── main.tsx              # Entry point
```

## Code Quality

- **Run `pnpm lint` before requesting reviews** — fix all issues
- **Run `pnpm format`** — auto-format with Prettier
- **Run `pnpm test`** — ensure all tests pass
- **Skip no ESLint rules** — follow Airbnb styleguide
- **Don't use inline comments** — write self-documenting code

## Before Committing

```bash
pnpm lint      # Check code quality
pnpm format    # Format code
pnpm test      # Run tests
pnpm build     # Verify production build works
```

## Common Pitfalls to Avoid

- ❌ Importing from `@mui/material` instead of `@wso2/oxygen-ui`
- ❌ Using `any` types
- ❌ Skipping ESLint rules with `// eslint-disable`
- ❌ Hardcoded colors/spacing — use theme tokens via `sx`
- ❌ Creating features without tests
- ❌ Large monolithic components
- ❌ Prop drilling instead of context/state management

## Resources

- `AGENTS.md` — Oxygen UI component guidelines and patterns
- `README.md` — Project setup, scripts, and structure
