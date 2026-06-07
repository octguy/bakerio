# Development guide

Local setup, common workflows, and the gotchas you'll otherwise hit.

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Go | 1.22+ | <https://go.dev/dl/> |
| Docker + Compose | recent | <https://www.docker.com/> |
| `golang-migrate` | v4+ | `brew install golang-migrate` |
| `sqlc` | v1.25+ | `brew install sqlc` |
| `swag` | latest | `go install github.com/swaggo/swag/cmd/swag@latest` |
| `psql` (optional) | any | `brew install postgresql@15` — handy for ad-hoc inspection |

## 2. First-time setup

```bash
git clone <repo> && cd backend
cp .env.example .env          # adjust if you have port conflicts
make docker-up                # boots Postgres, Redis, RabbitMQ, MinIO, MailHog
make migrate-up               # applies db/migrations/*.up.sql in order
make run                      # starts API on $SERVER_PORT (default 8080)
```

If everything came up cleanly:
- API: `http://localhost:8080/api/v1/...`
- Swagger UI: `http://localhost:8080/swagger/index.html`
- MailHog (outgoing email): `http://localhost:8025`
- MinIO console: `http://localhost:9001` (`minioadmin` / `minioadmin`)
- RabbitMQ management: `http://localhost:15672` (`guest` / `guest`)

## 3. Daily workflow

### Add a new endpoint

1. Touch the right module under `internal/<name>/`:
   - **DTO** under `dto/` (with binding tags + `@name` for swagger)
   - **Service method** in `service/`
   - **Handler method** in `handler/` (with `// @Summary`, `// @Router`, etc.)
   - Register in `RegisterRoutes(public, protected)` inside the same handler file
2. If new SQL is needed:
   - Write the migration: `make migrate-create name=add_x_to_y`
   - Write the query in `db/queries/<module>/*.sql`
   - Regenerate: `make sqlc`
   - Add the query wrapper to the repo
3. Regen Swagger: `swag init -g cmd/server/main.go --parseDependency --parseInternal -o docs`
4. Test it via `curl` against `http://localhost:8080/api/v1/...` — Swagger UI at `/swagger/index.html` is the canonical request/response reference

### Add a new module

1. `internal/<name>/{dto,handler,repository,service}/` + a `module.go` exposing a `Module` struct with `New(deps Deps)` and (if HTTP) `RegisterRoutes`
2. Add the schema migration + `db/queries/<name>/` + a new `sqlc.yml` entry (clone an existing block — share the `*overrides` anchor)
3. Wire the module in `cmd/server/modules.go` — construct it inside `buildModules` and add it to the `modules` struct
4. (If HTTP) register routes in `cmd/server/http.go`
5. If your module publishes events: write to `outbox.events` via the shared `outbox.Repository`. **Do not create a per-module outbox table** — the architecture rule is "one shared outbox table, routing key disambiguates".

### Add a new event

1. Constant in `internal/shared/event/events.go` (e.g. `OrderCancelled = "order.cancelled"`)
2. Payload struct in `internal/shared/event/payload.go`
3. Producer: inside the relevant service's transaction, call `outboxRepo.Save(txCtx, event.Foo, FooPayload{...})`
4. Consumer: extend the dispatcher in `internal/notification/service/dispatcher.go` — add a case in the appropriate `Handle<X>Queue` method (it switches on routing key)
5. If the routing key uses a new prefix (`payment.*`, `shipping.*`, …) declare a queue binding in `internal/platform/mq/topology.go` and register a consumer in `internal/notification/module.go`

### Add a new permission

Permissions are seeded by migration `000010_seed_permissions.up.sql`. To add one:

1. Add a new migration: `make migrate-create name=add_perm_xxx_view_branch`
2. In the `.up.sql`: `INSERT INTO auth.permissions (name) VALUES ('xxx:view:branch') ON CONFLICT DO NOTHING;` then INSERT into `auth.role_permissions` for the relevant roles
3. Use it in handlers: `middleware.RequirePermission("xxx:view:branch")` or `middleware.RequireAnyPermission(...)`
4. The cache warms at startup; nothing else to wire

## 4. Reset & seed cycles

```bash
make reset-db                              # drop all data, re-apply migrations
make run                                   # start server

# In another terminal:
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
   -H 'Content-Type: application/json' \
   -d '{"email":"superadmin@bakerio.com","password":"123456"}' \
   | jq -r .data.access_token)
curl -X POST http://localhost:8080/api/v1/admin/seed-demo \
   -H "Authorization: Bearer $TOKEN"
```

The seed is **idempotent** — re-running it with branches already present is a no-op (it returns `{skipped: true}` with current counts).

After the seed:
- 10 branches, 80 products (with 160 placeholder images via picsum.photos), 300 orders spanning ~2 years
- 23 customers, 10 branch managers, 40 branch staff, 1 product manager, 1 super_admin
- 15 vouchers (5 plain percent, 4 capped, 3 with min-subtotal, 2 expired, 1 inactive)
- All 23 customers have a `users.memberships` row, tier derived from their seeded order history
- A few customers will be SILVER, most BRONZE — none at GOLD (would need ~5M VND lifetime spend)

## 5. Database hygiene

| Need | Command |
|---|---|
| Apply pending migrations | `make migrate-up` |
| Roll back 1 | `make migrate-down` |
| Roll back N | `make migrate-down-n n=3` |
| Reset (destructive) | `make reset-db` |
| Unblock dirty migration | `make migrate-force v=N` (set to last known good) |
| Inspect a table | `psql $DB_URL -c '\d schema.table'` |
| Inspect outbox | `psql $DB_URL -c 'SELECT routing_key, COUNT(*), COUNT(*) FILTER (WHERE published_at IS NULL) AS pending FROM outbox.events GROUP BY 1'` |

Each migration is **forward-and-back tested** in CI-style: down the latest, then back up. Always provide a working `.down.sql` even if it's just `DROP TABLE`.

## 6. Common gotchas

- **`auth.outbox` is gone.** All events flow through `outbox.events` (a dedicated `outbox` schema) — see `ARCHITECTURE.md` §7. If you find `auth.outbox` referenced anywhere in code, it's stale.
- **Money is raw VND as `decimal.Decimal`** stored in `NUMERIC(12,2)` (`NUMERIC(14,2)` for cumulative). Don't multiply by 1000; `"25000"` already means 25.000đ.
- **Time fields use Asia/Ho_Chi_Minh** for everything calendar-aligned (today/week/month). The conversion idiom is `date_trunc('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'`. Look at `db/queries/statistics/` for examples.
- **Cross-module rule**: a module writes only to its own schema (+ `outbox.events`). Cross-module writes go through the other module's service interface, never its repo. The compiler does not enforce this; reviewers do.
- **Tx propagation**: services call `tx.WithTx(ctx, fn)`; the inner `fn` receives a tx-aware ctx. Repos pull the tx out via `pkg/txmanager.Extract(ctx)` and use `r.db.WithTx(tx)` to bind to that connection.
- **Sqlc named args**: when you need conditional WHERE clauses, use `sqlc.arg('flag_name')::boolean` plus `CASE WHEN` for one-of-two columns. Don't `sqlc.narg(...)` unless you really mean SQL `NULL`.
- **Pointer vs value**: small structs return by value; return `*T` only when the type is large or when nil-vs-zero is semantically meaningful.
- **Logging**: `internal/platform/logger.Log.Info("msg", zap.X(...))`. **No `fmt.Println`** in committed code.

## 7. Testing

There's no project-wide test runner yet. Tests live next to the code:

```bash
go test ./internal/membership/...      # the few packages that have tests
go test ./...                          # everything
```

For now, ad-hoc curl is the main verification path. End-to-end tests live in `test/`.

## 8. Stuck?

- "I can't see anything in `outbox.events`" → rows aren't deleted, just published. `SELECT routing_key, published_at - created_at AS lag FROM outbox.events ORDER BY created_at DESC LIMIT 10;`
- "Worker isn't draining" → check `RABBITMQ_URL` reachable, then check the logs for `consumer: handler failed, nacking`
- "Email not arriving" → MailHog at `http://localhost:8025`. SMTP errors show up in stdout as `email: send failed`
- "Permission denied on an endpoint I should be able to hit" → JWT middleware caches permissions in Redis at boot; restart after a permission migration
- "Migrations dirty" → `make migrate-force v=N` to the last known good, then `make migrate-up` again
