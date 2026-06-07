# Architecture

Bakerio is a **modular monolith** in Go. One binary, one Postgres database,
multiple schemas — each schema owned by exactly one module. The shape is
optimized for "one team, one ops cluster, fast feedback" — not microservices.

## 1. High-level layout

```
            HTTP (Gin)
                │
                ▼
   ┌────────────────────────────────────────────────────┐
   │ Modules: auth, user, branch, product, cart, order, │
   │ voucher, membership, statistics, notification      │
   │                                                    │
   │ Each module: dto/ handler/ service/ repository/    │
   └────────────────┬───────────────────────────────────┘
                    │
        ┌───────────┼───────────┬─────────────┐
        ▼           ▼           ▼             ▼
   Postgres      Redis      RabbitMQ        MinIO
   (one DB,      (cache,    (outbox →       (product
    many         sessions,  consumer)        images)
    schemas)     OTP)
```

Composition root: `cmd/server/main.go`. Reads top-to-bottom: build infra →
build modules → wire late deps → start HTTP + outbox worker + MQ consumers.

## 2. Module shape

Every module under `internal/<name>/` follows the same convention:

```
internal/order/
  dto/             # request/response shapes (with binding + @name tags)
  handler/         # Gin handlers + RegisterRoutes(public, protected)
  service/         # business logic; defines interfaces other modules depend on
  repository/      # sqlc-backed data access; tx-aware via pkg/txmanager
  module.go        # Module struct, Deps struct, New(), accessors
```

Each module exposes a `Module` struct that holds its services and handlers.
The composition root creates them and wires cross-module deps. Modules
expose narrow Go interfaces, not concrete types — see `internal/order/service/checkout_service.go`'s
`Catalog`, `UserLookup` for examples.

## 3. The cross-module rule

> A module writes only to its own schema (+ the shared `outbox.events` table).
> A transaction opened by module A may not write to module B's tables, even
> via an interface.

This is enforced by convention, not by the compiler. **The rule is what
keeps the monolith refactor-friendly.** If you don't follow it, you've
accidentally built a tightly-coupled mess that looks separable but isn't.

How modules communicate without violating the rule:

| Pattern | Use when | Example |
|---|---|---|
| **Port/interface** | Read-only cross-module data | Order service has a `Catalog` interface satisfied by product service |
| **Use-case orchestration** | Need to call two modules' services without sharing a tx | The composition root or a thin "orchestrator" calls them sequentially |
| **Domain event + outbox** | Side effects across modules | `/orders/confirm` writes `order.placed` to `outbox.events`; notification consumes |

When two modules need cross-talk in the same transaction, prefer the
**outbox pattern** (§7) over sharing a tx. Sharing a tx across modules
leaks ownership and erodes the rule.

## 4. Persistence

### Schemas

| Schema | Owner module | Notable tables |
|---|---|---|
| `auth` | auth | users, credentials, roles, permissions, role_permissions, user_roles |
| `users` | user | profiles, addresses, memberships |
| `branch` | branch | branches, branch_memberships |
| `product` | product | categories, products, product_images, branch_products |
| `cart` | cart | carts, cart_items |
| `orders` | order | orders, order_items |
| `voucher` | voucher | vouchers, redemptions |
| `notification` | notification | user_notifications |
| `outbox` | shared (platform) | events |

`outbox` is the only schema not owned by a single business module — it's
the shared producer-side table for the transactional outbox pattern.

### sqlc

Each module has its own sqlc package: `db/sqlc/<name>/`. Queries live in
`db/queries/<name>/*.sql`. The `sqlc.yml` defines one entry per module, all
sharing a YAML anchor `*overrides` for type mappings (uuids → `uuid.UUID`,
numerics → `decimal.Decimal`, etc.). When adding a module's persistence: add
a new entry to `sqlc.yml`, create `db/queries/<name>/`, run `make sqlc`.

### Migrations

`db/migrations/NNNNNN_<name>.{up,down}.sql` — strict sequential numbering,
applied via `golang-migrate`. Always provide a working `.down.sql`.

## 5. Transactions

`pkg/txmanager` provides the primitive:

```go
err := tx.WithTx(ctx, func(txCtx context.Context) error {
    if _, err := s.repo.CreateOrder(txCtx, ...); err != nil { return err }
    if err := s.voucher.Redeem(txCtx, ...); err != nil { return err }
    return s.outbox.Save(txCtx, event.OrderPlaced, payload)
})
```

Repos pull the tx out of the context via `txmanager.Extract(ctx)` and call
`r.db.WithTx(tx)` to bind sqlc queries to that connection. Outside a tx,
they use the connection pool directly. This means a service can be called
with or without a tx-aware ctx and Does The Right Thing.

The order-confirm tx is the canonical multi-write example: stock decrement
+ order insert + items insert + voucher redemption + membership upsert +
outbox saves, all in one atomic Postgres tx.

## 6. Authentication & authorization

### JWT

`POST /auth/login` returns an access token signed with HS256 + `$JWT_SECRET`.
The token contains `{user_id, roles[], jti, exp, iat}`. Middleware
`platform/middleware.JWTAuth(authSvc)` validates the token, checks the
JTI against the Redis blacklist (for logout), and puts the user id +
roles into the request context.

### RBAC

Permission strings are flat: `"order:view:branch"`, `"voucher:manage:all"`,
`"*:*:all"` (super-admin wildcard). Seeded by `000010_seed_permissions.up.sql`.

`middleware.LoadPermissions(rbacSvc)` runs after JWT auth — it loads the
caller's effective permission set (warmed from Redis, falls back to Postgres)
into the context. Handlers gate with:

```go
g := protected.Group("/admin/vouchers", middleware.RequirePermission("voucher:manage:all"))
g.POST("", h.Create)

// or:
g.GET("/:id/products",
    middleware.RequireAnyPermission("product:manage:all", "branch:manage:own"),
    h.SetAvailability,
)
```

For "own resource" scoping (a branch_manager can only see their branch),
the handler does an in-process check using the caller's id and the resource
id, returning 403 (or 404 if you want to hide existence) on mismatch.

## 7. Messaging — outbox + RabbitMQ

The transactional outbox pattern decouples "I want to fire an event" from
"the event was published to RabbitMQ":

```
service.foo (inside tx):
  ├── INSERT my own row(s)
  └── outbox.Save(txCtx, "foo.bar", payload)   ← row goes to outbox.events
       (tx commits — outbox row visible)

worker (separate goroutine):
  ├── SELECT * FROM outbox.events WHERE published_at IS NULL ORDER BY created_at
  ├── publish each → "bakerio.events" topic exchange with routing_key
  └── UPDATE outbox.events SET published_at = NOW() WHERE id = ?

consumer (per queue):
  ├── queue "X.notifications" bound to "X.#" on the exchange
  ├── deserialize body + read routing_key
  └── dispatcher routes to the appropriate sub-handler
```

Why this matters: the outbox row commits **in the same tx** as the business
write. If the tx rolls back, no event is ever published. If the publish
crashes mid-way, the next worker poll retries. There is no scenario where
the business state and the event log disagree.

Producer-side guarantees: write → commit → eventually-published.

Consumer-side guarantees: at-least-once delivery (retry on nack). Handlers
must be **idempotent**.

Topology (declared in `internal/platform/mq/topology.go`):

| Queue | Bound to | Handler |
|---|---|---|
| `user.notifications` | `user.#` | `emailSvc.HandleUserRegistered` (OTP only) |
| `order.notifications` | `order.#` | `dispatcher.HandleOrderQueue` |
| `auth.notifications` | `auth.#` | `dispatcher.HandleAuthQueue` |
| `membership.notifications` | `membership.#` | `dispatcher.HandleMembershipQueue` |

## 8. Time

| Where | Convention |
|---|---|
| Storage | `TIMESTAMPTZ` (Postgres stores UTC) |
| API responses | ISO 8601 with timezone, e.g. `"2026-06-06T15:11:42+07:00"` |
| Calendar-aligned queries | `date_trunc(unit, t AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'` |
| Statistics bucket boundaries | Asia/Ho_Chi_Minh |

The client never has to do timezone math — the server's "today" / "this week"
/ "this month" align to HCMC calendar regardless of where the request came
from.

## 9. Money

Stored as `NUMERIC(12,2)` in raw VND (no fractional units in production data —
`.00` is cosmetic). `NUMERIC(14,2)` for cumulative running totals like
`users.memberships.total_spent` so an active customer can't overflow.

In Go: `github.com/shopspring/decimal.Decimal`. JSON-serialized as the string
representation: `"190000"` means 190.000 VND. **Do not multiply by 1000**
when rendering — it's already raw VND.

## 10. Observability

- **Logging**: structured via Zap (`internal/platform/logger`). Use
  `logger.Log.Info("event", zap.String("key", value), zap.Error(err))`.
  Never `fmt.Println` in committed code.
- **HTTP access log**: Gin default for now (stdout).
- **Errors to clients**: `internal/shared/apperrors.AppError{Code, Message,
  Details}` → mapped to HTTP status by `internal/shared/response/Error`.
- **Swagger** at `/swagger/index.html` — annotations are the source of truth.

## 11. The bigger picture

The full lifecycle of a real customer order, showing how every module
plays its part:

```
1. GET /products              product
2. POST /orders/find-branches order → branch.router → product (stock check)
3. POST /orders/select-branch order → product (price snapshot)
                              order → voucher.Validate
                              order → membership.GetForUser
                              order → cache.Save(Redis session, 10 min TTL)
4. POST /orders/confirm       order → cache.PopByID
                              ┌── one atomic tx ──────────────────────────┐
                              │  product.DecrementBranchStock             │
                              │  order.CreateOrder + CreateOrderItem      │
                              │  voucher.Redeem (if voucher used)         │
                              │  membership.ApplyOrderSpend (+ tier check)│
                              │  outbox.Save("order.placed", ...)         │
                              │  outbox.Save("membership.tier_upgraded",  │
                              │    if TierChange.Changed)                 │
                              └───────────────────────────────────────────┘
5. (async) outbox worker → publish to bakerio.events
6. (async) notification consumer:
     order.placed:
       - INSERT customer notification + send order receipt email
       - branch fanout: SELECT user_id FROM branch.branch_memberships
                        → INSERT one notification each (mgr + staff)
     membership.tier_upgraded:
       - INSERT customer tier-upgrade notification
7. customer GET /notifications → bell-icon feed
   customer GET /membership    → reflects the new tier
   manager  GET /notifications → sees the new order in the feed
```

Every step writes only to its own schema. Every cross-module side effect
goes through the outbox. The whole order tx is atomic; the user never sees
half-applied state.
