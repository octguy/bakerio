# Bakerio Backend

API backend for **Bakerio**, a single-city (HCMC) bakery e-commerce platform.
Go modular monolith on Postgres + Redis + RabbitMQ + MinIO.

## What's inside

- **Catalog** — products, categories, branches, per-branch stock + activation, product images
- **Cart + Checkout** — 3-step flow (`find-branches` → `select-branch` → `confirm`) with Redis 10-min sessions, atomic stock decrement, stock-conflict 409 protection
- **Order routing** — nearest-eligible branch selection with tiered shipping fees (15 / 25 / 40k VND), 15 km hard cap
- **Vouchers** — single-type percent discount with optional max-discount cap, one-per-user enforced by `UNIQUE(voucher_id, user_id)`
- **Membership** — BRONZE / SILVER / GOLD tiers from lifetime spend; tier auto-discount (0 / 5 / 10%) stacks additively with voucher
- **Statistics** — overview KPIs, per-branch dashboard with calendar-aligned today/week/month buckets (HCMC TZ), per-product breakdowns, configurable timeseries for charts
- **Notifications** — in-app feed (`/notifications`) + selective email; events flow via `outbox.events` → RabbitMQ → consumer fanout
- **Auth** — JWT + permission-based RBAC, OTP email verification on register, password-change + admin-reset both publish security events

Live API docs at **`http://localhost:8080/swagger/index.html`** once the server is running.

## Quick start

You'll need: Go 1.22+, Docker, `golang-migrate`, `sqlc`, `swag`.

```bash
cp .env.example .env       # adjust ports / secrets if needed
make docker-up             # boot Postgres + Redis + RabbitMQ + MinIO + MailHog
make migrate-up            # apply schema (db/migrations/)
make run                   # starts API on :8080
```

Then in another terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@bakerio.com","password":"123456"}' \
  | jq -r .data.access_token)

curl -X POST http://localhost:8080/api/v1/admin/seed-demo \
  -H "Authorization: Bearer $TOKEN"
# → 10 branches, 80 products + 160 images, 300 orders, 15 vouchers,
#   23 customers, 50 staff + 2 system users, memberships reconciled
```

Inspect MailHog at `http://localhost:8025` to see emails the system sends.

## Repository layout

```
cmd/server/        Composition root (main.go), wires modules, seeds admins,
                   starts HTTP server + outbox worker + consumer goroutines

internal/
  auth/            Login, register, JWT, RBAC, OTP verification, password change
  user/            Profile + addresses + admin user management
  branch/          Branches + branch_memberships + routing (nearest eligible)
  product/         Products + categories + images + per-branch activation/stock
  cart/            User carts
  order/           Checkout (find-branches/select-branch/confirm), list, detail
  voucher/         Voucher CRUD + Validate/Redeem during checkout
  membership/      Lifetime spend + tier label + tier auto-discount
  statistics/      KPIs + branches list + branch detail + products + timeseries
  notification/    Bell-icon feed + consumer dispatcher (in-app + email)
  shared/          Cross-module types: apperrors, domain, event, response, authcontext
  platform/        Infra adapters: cache, database, email, logger, middleware,
                   mq, otp, outbox, storage

pkg/               Project-agnostic helpers: config, pagination, txmanager, dbq

db/
  migrations/      golang-migrate sequential SQL (up/down pairs)
  queries/         sqlc input SQL, one folder per module
  sqlc/            generated Go (auth, branch, product, ..., notification)

deployments/       docker-compose for Postgres, Redis, RabbitMQ, MinIO, MailHog
docs/              Swagger output (docs.go, swagger.json, swagger.yaml) — generated
test/              Manual test fixtures + scripts
```

## Common commands

| Command | What |
|---|---|
| `make run` / `make stop` | Run / kill the local server |
| `make tidy` | `go mod tidy` |
| `make sqlc` | Regenerate Go from `db/queries/**/*.sql` (config in `sqlc.yml`) |
| `make migrate-up` / `make migrate-down` | Apply / roll back one migration |
| `make migrate-down-n n=2` | Roll back N migrations |
| `make reset-db` | Down-all + up-all (wipes data) |
| `make migrate-create name=add_x_to_y` | New sequential migration pair |
| `make migrate-force v=N` | Mark migration version (fixes dirty state) |
| `make docker-up` / `make docker-down` / `make docker-reset` | Compose lifecycle |
| `make docker-mail` | Open MailHog (`http://localhost:8025`) |
| `swag init -g cmd/server/main.go --parseDependency --parseInternal -o docs` | Regen Swagger |

## Sample accounts (after `/admin/seed-demo`)

All passwords are `123456` (dev seed only).

| Role | Email | Notes |
|---|---|---|
| super_admin | `superadmin@bakerio.com` | Bootstrapped on first boot, can do everything |
| product_manager | `productmanager@bakerio.com` | Manage catalog + vouchers |
| branch_manager | `manager1@bakerio.com` … `manager10@bakerio.com` | One per branch |
| branch_staff | `staff1a@bakerio.com` … `staff10d@bakerio.com` | 4 per branch |
| customer | `customer1`–`3`, `alice`, `bob`, `charlie`, `diana`, … | 23 total |

## Where to read more

- **`ARCHITECTURE.md`** — modular-monolith shape, schemas, tx model, outbox + MQ pipeline, end-to-end order flow
- **`DEVELOPMENT.md`** — daily workflow (add an endpoint / module / event / permission), reset & seed cycles, common gotchas
- **`CLAUDE.md`** — guidance for AI assistants working in this repo
- **Swagger UI** — `http://localhost:8080/swagger/index.html` (authoritative API reference)
