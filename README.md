# Bakerio

> A single-city (HCMC) bakery e-commerce platform — a Go modular-monolith API behind
> three Next.js frontends, run as one Docker Compose stack.

Bakerio lets customers browse a bakery's catalog, get routed to the nearest branch
that can fulfil their order, check out with vouchers and membership discounts, and
track their orders — while branch staff, managers, and admins run the operation from
a separate console (catalog, stock, staff, vouchers, statistics).

## Repository layout

This is a polyglot monorepo with three top-level units:

```
backend/     Go modular monolith — Gin + pgx + sqlc, Postgres (schema-per-module),
             Redis, RabbitMQ (transactional outbox), MinIO, JWT + RBAC
frontend/    Turborepo (npm workspaces) — three Next.js 16 apps + shared packages
deploy/      Docker Compose stacks (local + prod), Nginx reverse proxy, Let's Encrypt
.github/     CI/CD workflows (backend + frontend, build → push → deploy)
```

Each unit has its own README with the detail; this file is the map.

| Area | Start here |
|---|---|
| Backend overview & quick start | [backend/README.md](backend/README.md) |
| Backend architecture (modules, schemas, outbox, order flow) | [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) |
| Backend day-to-day workflow & gotchas | [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md) |
| Frontend overview & app responsibilities | [frontend/README.md](frontend/README.md) |
| Deployment (local full stack + production) | [deploy/README.md](deploy/README.md) |

## The three frontends

The frontend is one Turborepo with three independently-deployable Next.js apps that
all talk to the same backend API:

| App | Audience | Dev port | What it is |
|---|---|---|---|
| `web` | Public | 3000 | Branding / marketing landing site |
| `order` | Customers | 3001 | Storefront — menu, cart, checkout, order tracking, profile |
| `console` | Staff / managers / admins | 3002 | Back-office — catalog, stock, branches, staff & roles, vouchers, statistics |

Shared code lives in `frontend/packages/`: `@repo/api-client` (typed backend client),
`@repo/ui` (component library), plus shared `eslint-config` and `typescript-config`.

## Tech stack

**Backend** — Go 1.26, Gin, pgx, [sqlc](https://sqlc.dev), PostgreSQL 16 (one database,
one schema per module), Redis 7 (cache / sessions / OTP), RabbitMQ 3.13 (transactional
outbox → consumer fanout), MinIO (S3-compatible image storage), JWT (HS256) +
permission-based RBAC, Swagger for API docs.

**Frontend** — Turborepo, Next.js 16, React 19, TanStack Query, Zustand, Tailwind CSS 4,
Radix UI, `next-intl` (i18n), Leaflet (maps), TypeScript end-to-end.

**Infra / ops** — Docker + Docker Compose, Nginx (reverse proxy + TLS termination),
Certbot / Let's Encrypt, GitHub Actions (CI/CD).

## Quick start (full stack, one command)

The fastest way to see everything running together is the local Compose stack, which
boots infrastructure + backend + all three frontends with production fidelity (the
frontends prerender against a live backend, exactly like CI):

```bash
cd deploy
./up-local.sh
```

When it finishes:

| Service | URL |
|---|---|
| `web` (branding) | <http://localhost:3001> |
| `order` (storefront) | <http://localhost:3002> |
| `console` (back-office) | <http://localhost:3003> |
| Backend API | <http://localhost:8080/api/v1> |
| Swagger UI | <http://localhost:8080/swagger/index.html> |
| MailHog (outgoing email) | <http://localhost:8025> |
| MinIO console | <http://localhost:9001> (`minioadmin` / `minioadmin`) |
| RabbitMQ management | <http://localhost:15672> (`guest` / `guest`) |

The stack auto-seeds a demo dataset (10 branches, 80 products, 300 orders, customers
and staff). All seeded accounts use the password `123456` — sign in to `console` as
`superadmin@bakerio.com` to explore everything. See
[backend/README.md](backend/README.md) for the full account list.

> Prefer to run pieces separately while developing? Run the backend with
> `make run` (see [backend/README.md](backend/README.md)) and the frontends with
> `npm run dev` (see [frontend/README.md](frontend/README.md)). Dev ports differ
> from the Compose ports above — 3000 / 3001 / 3002.

## How it fits together

```
            ┌──────────┐   ┌──────────┐   ┌──────────┐
            │   web    │   │  order   │   │ console  │     Next.js apps
            └────┬─────┘   └────┬─────┘   └────┬─────┘
                 └──────────────┼──────────────┘
                                │ HTTPS (Nginx reverse proxy in prod)
                                ▼
                    ┌───────────────────────┐
                    │   backend API (Gin)   │   modular monolith
                    └───────────┬───────────┘
              ┌─────────┬───────┼────────┬──────────┐
              ▼         ▼       ▼        ▼          ▼
          Postgres   Redis   RabbitMQ  MinIO     (MailHog/SMTP)
        (schemas)  (cache)  (outbox)  (images)   (email)
```

Cross-module side effects (an order placed, a membership tier upgraded, an account
event) are never written across schema boundaries — they flow through a transactional
outbox to RabbitMQ and are consumed asynchronously. The end-to-end order lifecycle is
documented in [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md).

## CI/CD

GitHub Actions in [.github/workflows/](.github/workflows/) run on pushes to `main`:

- **Backend CI / CD** — lint & build, then build the Docker image, push it, and deploy.
- **Frontend CI / CD** — lint & type-check & test, then build the `order` and `console`
  images, push them, and deploy.

Production runs the images via [deploy/docker-compose.prod.yml](deploy/docker-compose.prod.yml)
behind Nginx with Let's Encrypt TLS. See [deploy/README.md](deploy/README.md).
