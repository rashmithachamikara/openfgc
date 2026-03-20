# openfgc-portal

React 19 + TypeScript + Vite app using WSO2 Oxygen UI.

## Requirements

- Node.js 20.19+ (or 22.12+)
- Corepack enabled
- pnpm

## Package Manager

This project uses pnpm.

```bash
corepack enable
corepack prepare pnpm@10.6.5 --activate
```

If your machine cannot install global Corepack shims due permission restrictions, use `corepack pnpm` directly.

## Install

```bash
pnpm install
```

## Scripts

```bash
pnpm dev
pnpm lint
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm build
pnpm preview
```

## Testing

Tests are written with [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/react).

- **Test files**: Located in `src/__tests__/` with `.test.tsx` extension
- **Setup**: Global setup in `vitest.setup.ts` imports jest-dom matchers
- **Run tests**: `pnpm test` or `pnpm test:watch` for watch mode
- **Coverage**: `pnpm test:coverage` generates HTML coverage report in `coverage/`

## CI

GitHub Actions CI runs pnpm-based install, lint, and build checks on every push and pull request.
