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
pnpm build
pnpm preview
```

## CI

GitHub Actions CI runs pnpm-based install, lint, and build checks on every push and pull request.
