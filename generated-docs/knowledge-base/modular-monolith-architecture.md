# Modular Monolith Architecture

> Discussion summary — Bakerio backend design decisions

---

## Stateless DB Functions

**Q: Should I explicitly use stateless functions for DB access in a modular monolith?**

sqlc already gives you this pattern. It generates a `Queries` struct that holds only a db reference — no mutable state, no side effects. Every method is effectively a stateless function:

```go
// sqlc-generated — Queries holds nothing but the db handle
type Queries struct { db DBTX }
func (q *Queries) GetUserByEmail(ctx, email) (User, error)
```

Each module owns its own SQL query files and gets its own `Queries` instance. Modules never reach into each other's DB layer — they communicate through service interfaces.

```
modules/
  auth/     → auth.sql queries, auth.Service interface
  orders/   → orders.sql queries, orders.Service interface
  products/ → products.sql queries
```

> **Decision needed with lead:** `emit_interface: true` in `sqlc.yaml` makes each module's DB layer mockable for testing. Decide before writing the first query file.

---

## Query Complexity — Module Boundaries, Not Query Complexity

**Q: No complex queries across tables? Just simple ones and cross-calling service layer?**

The rule is about **module boundaries**, not query complexity.

**Within a module → JOINs are fine and preferred:**
```sql
-- orders module owns orders + order_items + order_payments
SELECT o.*, oi.*, op.status
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN order_payments op ON op.order_id = o.id
WHERE o.id = $1
```

**Across module boundaries → service call instead of JOIN:**
```go
// ❌ orders query JOINing into users table (auth module's territory)
SELECT o.*, u.email FROM orders o JOIN users u ON u.id = o.user_id

// ✅ orders service calls auth service instead
user, err := s.authService.GetUser(ctx, order.UserID)
```

### Module → Table Ownership

| Module | Owns |
|---|---|
| `auth` | `users` |
| `branches` | `branches`, `branch_staff` |
| `products` | `products`, `product_option_groups`, `product_options` |
| `orders` | `orders`, `order_items`, `order_payments`, `cart_items` |
| `notifications` | `notifications` |

---

## Circular Dependencies

**Q: Would cross-module service calls result in circular dependencies?**

Yes, if not careful. Solution: **strict dependency direction (DAG)**.

```
Level 0 (no deps):        auth, branches
Level 1 (calls L0):       products → branches
Level 2 (calls L0+L1):    orders → auth, branches, products
Level 3 (called by all):  notifications
```

`notifications` is the tricky case — `orders` fires notifications, but `notifications` shouldn't import `orders`. Break the cycle with an interface defined in the **caller's** package:

```go
// inside orders package — orders defines what it needs
type Notifier interface {
    Notify(ctx context.Context, userID uuid.UUID, eventCode string, payload any) error
}

// orders struct holds the interface, not the concrete type
type orderService struct {
    notifier Notifier
}
```

`orders` never imports `notifications`. The concrete `notifications.Service` is injected at startup in `main.go`.

**Rule:** if A calls B and B calls A → one of them is wrong about its responsibility. Redesign until the graph is a DAG.

---

## Dependency Hell

**Q: Does this mean including lots of functions not owned by the service?**

Three things keep it manageable:

**1. Narrow interfaces — inject only what you need**
```go
// ❌ inject entire products.Service (20 methods)
type orderService struct { productSvc products.Service }

// ✅ define only what orders actually calls
type PriceLookup interface {
    GetProductPrice(ctx context.Context, productID uuid.UUID) (int64, error)
}
type orderService struct { prices PriceLookup }
```

**2. Snapshots eliminate most cross-service reads**

`order_items.unit_price` is stored at cart-add time. At checkout, `orders` never re-fetches price from `products`. The snapshot pattern directly reduces live dependencies.

**3. Most needed data is already in the JWT**

`orders` already has `userID` from the JWT. It passes that ID to the notifier, which resolves user details itself.

In practice, `orderService` needs only:
```go
type orderService struct {
    queries  *db.Queries  // own tables
    prices   PriceLookup  // 1 method from products
    notifier Notifier     // 1 method
}
```

---

## Implementation Summary

### Directory Structure
```
backend/
├── cmd/server/         # main.go — wires everything, starts server
├── pkg/
│   ├── config/         # godotenv, typed config struct, panic on missing vars
│   └── middleware/     # JWT, RBAC, RequestID, zerolog request logger
├── db/
│   ├── migrations/     # golang-migrate .up.sql / .down.sql
│   ├── queries/        # sqlc .sql files, one folder per module
│   └── generated/      # sqlc output — never edit manually
└── modules/
    ├── auth/
    ├── branches/
    ├── products/
    ├── orders/
    └── notifications/
```

### Each Module Owns
```
modules/orders/
├── service.go       # interface + struct, business logic only
├── handler.go       # Gin handlers, call service, return JSON
├── model.go         # request/response types
└── errors.go        # module-scoped error codes
```

### Dependency Direction (strict, no exceptions)
```
auth          ← no deps
branches      ← no deps
products      → branches
orders        → auth*, products*, branches*, notifications*
notifications → auth*

* via narrow interface defined in the caller's package
```

### Wiring (main.go only)
```go
authSvc    := auth.NewService(queries)
branchSvc  := branches.NewService(queries)
productSvc := products.NewService(queries, branchSvc)
notifSvc   := notifications.NewService(queries, authSvc)
orderSvc   := orders.NewService(queries, productSvc, notifSvc)
```

### sqlc Config (`sqlc.yaml`)
```yaml
emit_interface: true               # mockable DB layer per module
emit_pointers_for_null_types: true
```

### Rules
- No module imports another module's package directly — interfaces only
- No JOINs across module boundaries in SQL
- `main.go` is the only place that knows about all modules
- Business logic lives in `service.go`, never in handlers

---

## Second Opinion — Codex (gpt-5.4)

> Reviewed against Go idioms and production concerns.

### ✅ Solid
- Dependency direction (DAG) and narrow consumer-owned interfaces are idiomatic Go
- Thin handlers (bind → service → respond) — correct boundary
- Module owns its tables — prevents random packages mutating each other's data

### ⚠️ Risky

**1. Absolute ban on cross-module JOINs is too strict**
In a monolith with one DB, forcing every cross-module read through a service call causes N+1 queries and chatty orchestration. Better rule: *no cross-module writes; read-only cross-module JOINs allowed when well-justified and kept off write paths.*

**2. Transaction boundaries are undefined**
The real concern with sqlc isn't "stateless" — it's `WithTx`. What's inside the checkout `BEGIN/COMMIT`? What isn't? Must be defined before writing order flows.

**3. Sync notifications in the request path = partial failure**
Order commits → notification fails → inconsistent state. Use an **outbox pattern**: insert a `notifications` row in the same transaction, dispatch async in background.

**4. Don't over-trust JWT claims**
JWT is fine for identity (`userID`, `role`). Branch membership, account status, pricing context — these change independently of token lifetime. Hit the DB for mutable authorization facts.

**5. `emit_interface: true` — prefer real DB tests**
Mocking sqlc interfaces produces fake tests that miss actual SQL breakage. Test against real Postgres with a transactional test DB instead.

**6. `pkg/` + `modules/` → prefer `internal/`**
More idiomatic Go. Prevents accidental external reuse:
```
internal/auth
internal/orders
internal/platform/db
internal/httpapi
```

### ❌ Missing (resolve before adding more modules)

| Gap | Why it matters |
|---|---|
| Transaction policy | Who calls `WithTx`; can services share a tx? |
| Idempotency | Checkout/payment duplicate request handling |
| Outbox / async events | Safe notification delivery |
| Error model | Domain errors vs HTTP errors; pgx sqlstate handling |
| Authorization boundaries | Which RBAC checks must hit DB vs trust JWT |
| Read model strategy | Cross-module admin dashboard queries |
| Bootstrap layer | Extract `app.go` wiring layer — `main.go` grows fast |
| Observability | Structured logging, request IDs, tracing, pool stats |
| Operational | Graceful shutdown, health probes, connection pool sizing, timeouts |

---

## Second Opinion — Gemini (gemini-3.1-pro-preview)

> Reviewed against Go idioms, sqlc/pgx v5 specifics, and production concerns.

### ✅ Solid
- **Consumer-owned interfaces** — defining `Notifier` inside `orders` (the consumer) follows Go's *"accept interfaces, return structs"* proverb exactly
- **DAG dependency direction** — Go's compiler forbids circular imports anyway; enforcing a DAG is both good design and a compilation requirement
- **sqlc + pgx v5** — gold standard for Go DB interaction; type-safe, no reflection overhead like GORM
- **Thin handlers** — keeping Gin handlers to HTTP concerns only makes the service layer highly testable

### ⚠️ Risky

**1. "No cross-module JOINs" is a performance trap**
Fetching 50 orders then making 50 service calls to get user data per order is a severe N+1. Enforce boundaries on **writes** (a module never mutates another's tables), but allow **read-only cross-module JOINs** for lists and dashboards — a targeted sqlc query is vastly superior to application-layer orchestration.

**2. `emit_interface: true` — mocks don't verify constraints**
Mocking the DB layer is widely considered an anti-pattern in Go today. Mocks don't verify foreign key constraints, unique indexes, or Postgres-specific syntax. Set `emit_interface: false`. Write integration tests against real Postgres using Testcontainers.

**3. `pkg/` + `modules/` is outdated**
`pkg/` for internal application code is an old pattern. Move everything under `internal/` — Go's compiler enforces that `internal/` code cannot be imported by other modules.
```
internal/core/orders
internal/core/auth
internal/transport/http   # Gin handlers
```

### ❌ Missing

**Transaction management (biggest gap)**
sqlc generates `WithTx(tx pgx.Tx) *Queries`. If `OrderService` needs to create an order, reduce stock, and clear a cart in one transaction — how is that `pgx.Tx` shared across services? Options: pass `pgx.Tx` explicitly in method signatures, or use a Unit of Work pattern. Passing tx via `context.Context` is a common hack but hides dependencies and is discouraged.

**Context propagation**
`ctx context.Context` must be the first parameter of every DB and service call. pgx uses it for query cancellation — if a user closes their browser, Gin cancels the request context, which cancels the Postgres query, saving DB resources.

**pgxpool configuration**
Max connections, min connections, max connection lifetime must be explicitly configured to prevent connection starvation under load.

**Error translation middleware**
Use `fmt.Errorf("...: %w", err)` to bubble errors up. Add a central Gin middleware to translate domain errors (e.g., `orders.ErrInsufficientStock`) into HTTP responses (e.g., `409 Conflict`) without leaking Postgres `sqlstate` to the client.

**Graceful shutdown**
On `SIGTERM` (Docker/Kubernetes stop), the server must call `server.Shutdown(ctx)` and close `pgxpool` — allowing active requests to finish instead of dropping them.
