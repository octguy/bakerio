# Bakerio Frontend

The Bakerio web frontend — a [Turborepo](https://turborepo.dev) monorepo (npm
workspaces) holding **three Next.js 16 apps** that share a typed API client and a
component library. Everything talks to the [Go backend](../backend/README.md).

## Apps

| App | Audience | Dev port | Responsibility |
|---|---|---|---|
| [`apps/web`](apps/web) | Public | 3000 | Branding / marketing landing site |
| [`apps/order`](apps/order) | Customers | 3001 | Storefront — menu, cart, multi-step checkout, order tracking, profile & addresses, notifications |
| [`apps/console`](apps/console) | Staff / managers / admins | 3002 | Back-office — catalog & categories, per-branch stock, branches, staff & roles (RBAC), vouchers, statistics dashboards |

## Shared packages

| Package | What |
|---|---|
| [`packages/api-client`](packages/api-client) (`@repo/api-client`) | Typed client for the backend API — split by area (`/staff`, `/voucher`, `/notifications`, `/rbac`) plus a `/mock` layer for building without a live backend |
| [`packages/ui`](packages/ui) (`@repo/ui`) | Shared React component library |
| [`packages/eslint-config`](packages/eslint-config) | Shared ESLint config |
| [`packages/typescript-config`](packages/typescript-config) | Shared `tsconfig` bases |

## Tech stack

Next.js 16 (App Router, SSR + static prerender), React 19, TanStack Query (server
state), Zustand (client state, e.g. the cart), Tailwind CSS 4, Radix UI primitives,
`next-intl` (internationalization), Leaflet (branch maps), TypeScript throughout.
Tests: Vitest + Testing Library (unit) and Playwright (e2e).

## Prerequisites

- Node.js ≥ 18
- npm 10 (`packageManager` is pinned to `npm@10.9.4`)
- A running backend API for live data — see [backend/README.md](../backend/README.md).
  Without one, the apps fall back to the `@repo/api-client` mock layer.

## Setup

```bash
cd frontend
npm install
```

Environment defaults are committed in [`.env`](.env) (no secrets — dev URLs only).
Override locally with `frontend/.env.local` (gitignored). Key variables:

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` / `API_URL` | `http://localhost:8080/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_BRANDING_URL` | `http://localhost:3001` | URL of the `web` app |
| `NEXT_PUBLIC_ORDER_URL` | `http://localhost:3002` | URL of the `order` app |
| `NEXT_PUBLIC_CONSOLE_URL` | `http://localhost:3003` | URL of the `console` app |

> The committed defaults match the Docker Compose stack ports (3001/3002/3003). When
> you run apps directly with `npm run dev`, each app uses its own dev port
> (3000/3001/3002) from its `package.json` — point the URL vars at those if you rely
> on cross-app links locally.

## Common commands

Run from `frontend/`. Turbo fans tasks out across all workspaces.

| Command | What |
|---|---|
| `npm run dev` | Run all apps in dev mode (web :3000, order :3001, console :3002) |
| `npm run dev -- --filter=order` | Run a single app (`order`, `console`, or `web`) |
| `npm run build` | Build all apps and packages |
| `npm run lint` | Lint everything |
| `npm run check-types` | Type-check everything (`tsc --noEmit`) |
| `npm run format` | Prettier-format `**/*.{ts,tsx,md}` |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest (single run, CI mode) |
| `npm run test:e2e` | Playwright e2e suite |
| `npm run test:e2e:ui` | Playwright in UI mode |

Use Turbo [filters](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
(`--filter=<app>`) to scope `build` / `lint` / `dev` to one workspace.

## Layout

```
apps/
  web/        Branding site        (App Router, i18n, marketing components)
  order/      Customer storefront  (cart store, checkout proxy, order tracking)
  console/    Back-office console  (catalog, stock, staff/RBAC, vouchers, stats)
packages/
  api-client/ @repo/api-client — typed backend client + mock layer
  ui/         @repo/ui — shared components
  eslint-config/ , typescript-config/   shared configs
e2e/          Playwright specs
```

Each app uses a `proxy.ts` server route to forward authenticated requests to the
backend so tokens stay server-side.

## Deployment

Only `order` and `console` are containerized and deployed to production (the `web`
branding site is built the same way locally). Production images are built and pushed
by the [Frontend CI/CD workflows](../.github/workflows/) and run behind Nginx — see
[deploy/README.md](../deploy/README.md). The full local stack (all three apps + backend
+ infra) comes up via [`deploy/up-local.sh`](../deploy/up-local.sh).
