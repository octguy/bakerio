# Bakerio — System Architecture Document

> Version 2.0 | 2026-03-13

> **Diagram policy:** ASCII diagrams are not maintained manually. When a diagram becomes stale, replace its content with an AI generation prompt (marked `[DIAGRAM PROMPT]`) and regenerate on demand.

---

## 1. Architecture Overview

Bakerio uses a **monolith-first** approach: a single deployable backend application with a cleanly separated frontend. The internal structure is modular by domain, making future microservice extraction tractable without the operational cost of distributed systems during development.

> **[DIAGRAM PROMPT]** Generate an ASCII box architecture diagram for Bakerio with three tiers:
> - **CLIENT LAYER**: Customer Web App | Staff Dashboard | Admin Dashboard — React 18 + Vite 5 + Tailwind CSS
> - **BACKEND APPLICATION**: Go 1.22+ + Gin — 8 domain modules (Auth, Branches, Products, Cart, Orders, Payments, Notifications, Admin) — Shared Infrastructure (JWT Middleware, RBAC Guard, Error Handler, Request Logger, DB Client) — Payment Adapter (MockGateway only; Phase 2: VNPay/Momo) — Background Jobs via robfig/cron (auto-cancel orders) — Notification Service (in-app polling)
> - Connector between backend and DB: sqlc + pgx v5
> - **DATABASE**: PostgreSQL

---

## 2. Module Boundaries

Each module owns its routes, handlers, and services. DB queries live in the generated `/db/` package (sqlc); each service receives a `*db.Queries` (or `*pgxpool.Pool` for transactions) via constructor injection. No module reaches into another module's service layer — only through explicit function calls or shared structs.

| Module | Owns | Exposes |
|---|---|---|
| `auth` | User registration/login, JWT generation, RBAC middleware. Enforces `must_change_password` flag: seeded staff accounts have it set; login response includes the flag; all non-password-change endpoints return `403 MUST_CHANGE_PASSWORD` until cleared. | `Authenticate()` — verifies JWT, checks `token_version` match, fetches user row for `is_active` check (1 DB query per request on protected routes); `Authorize(roles...)` middleware |
| `branches` | Branch CRUD, branch-staff assignment | `GetBranchByID()` (used by products, orders) |
| `products` | Product + option group CRUD, availability | `GetProductWithOptions()`, `ValidateOptionsForProduct()` — enforces `min_select`/`max_select` per group |
| `cart` | Cart CRUD, branch-lock, price computation | `GetCartForCheckout()` (used by orders) |
| `orders` | Standard order lifecycle, auto-cancel job | `CreateOrderFromCart()`, `AdvanceOrderStatus()` |
| `payments` | Payment processing, adapter dispatch. One table: `order_payments`. | `ProcessOrderPayment(gateway, amount)` |
| `admin` | Reports aggregation, admin-only operations | — |
| `notifications` | In-app notification records + polling | `Notify(userID, event, payload)` |

> **ADR-001 note:** Cross-module calls happen only through each module's exported `Service` struct. No module accesses another module's repository or handler directly.

---

## 3. Request Lifecycle

> **[DIAGRAM PROMPT]** Generate an ASCII vertical flow diagram for the Bakerio request lifecycle with these ordered steps and annotations:
> 1. Client Request
> 2. RequestID middleware — `uuid.New().String()` injected; `X-Request-Id` header set; MUST run first
> 3. Rate Limiter — `golang.org/x/time/rate` via Gin middleware
> 4. Request Logger — `gin.Logger()`
> 5. Body Decoder + Validator — `c.ShouldBindJSON()` + `go-playground/validator` struct tags at handler level
> 6. Authenticate() middleware — verifies JWT signature, expiry, `token_version`; fetches user row for `is_active` check; checks `must_change_password`
> 7. Authorize(roles...) middleware — checks context user role against allowed roles
> 8. Route Handler (Gin HandlerFunc)
> 9. Service Layer — all business logic
> 10. sqlc Queries — generated type-safe functions; parameterized queries only
> 11. pgx v5 — PostgreSQL driver and connection pool
> 12. PostgreSQL
> 13. (response bubbles back up) Error Handler — Gin middleware; catches AppError, formats `{"error":{"code":"...","message":"..."}}`
> 14. Client Response

---

## 4. Directory Structure

```
bakerio/
├── cmd/
│   └── api/
│       └── main.go              ← wire Gin router, middleware, DB pool, start server
├── internal/
│   ├── auth/
│   │   ├── handler.go           ← Gin HandlerFuncs
│   │   └── service.go           ← business logic; uses *db.Queries and *pgxpool.Pool
│   ├── branches/
│   │   ├── handler.go
│   │   └── service.go
│   ├── products/
│   │   ├── handler.go
│   │   └── service.go
│   ├── cart/
│   │   ├── handler.go
│   │   └── service.go
│   ├── orders/
│   │   ├── handler.go
│   │   └── service.go
│   ├── payments/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── gateway/
│   │       ├── gateway.go       ← PaymentGateway interface
│   │       └── mock.go          ← MockGateway implementation
│   ├── notifications/
│   │   ├── handler.go
│   │   └── service.go
│   ├── admin/
│   │   ├── handler.go
│   │   └── service.go
│   └── middleware/
│       ├── auth.go              ← JWT validation + RBAC
│       ├── request_id.go
│       ├── rate_limit.go
│       └── logger.go
├── db/                          ← sqlc generated code — DO NOT EDIT MANUALLY
│   ├── db.go                    ← Querier interface + Queries struct
│   ├── models.go                ← Go structs generated from sql/schema.sql
│   ├── auth.sql.go
│   ├── branches.sql.go
│   ├── products.sql.go
│   ├── cart.sql.go
│   ├── orders.sql.go
│   ├── payments.sql.go
│   ├── notifications.sql.go
│   └── admin.sql.go
├── sql/
│   ├── schema.sql               ← CREATE TABLE + indexes + constraints; run once on fresh DB
│   └── queries/
│       ├── auth.sql             ← annotated SQL queries for sqlc codegen
│       ├── branches.sql
│       ├── products.sql
│       ├── cart.sql
│       ├── orders.sql
│       ├── payments.sql
│       ├── notifications.sql
│       └── admin.sql
├── sqlc.yaml                    ← sqlc configuration (engine: postgresql, out: db/)
├── pkg/
│   ├── config/
│   │   └── config.go            ← godotenv + config struct; panic on missing P0 vars
│   ├── database/
│   │   └── db.go                ← pgxpool.New() connection pool setup
│   ├── apperror/
│   │   └── apperror.go          ← AppError type + predefined error vars
│   └── response/
│       └── response.go          ← JSON response helpers (WriteJSON, WriteError)
├── frontend/                    ← React 18 + Vite 5
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── customer/
│   │   │   │   ├── BranchListPage.tsx
│   │   │   │   ├── ProductCatalogPage.tsx
│   │   │   │   ├── CartPage.tsx
│   │   │   │   ├── CheckoutPage.tsx
│   │   │   │   ├── OrderHistoryPage.tsx
│   │   │   │   └── OrderDetailPage.tsx
│   │   │   ├── staff/
│   │   │   │   ├── StaffOrderQueuePage.tsx
│   │   │   │   └── StaffProductsPage.tsx
│   │   │   └── admin/
│   │   │       ├── AdminBranchesPage.tsx
│   │   │       └── AdminStaffPage.tsx
│   │   ├── components/
│   │   │   ├── OptionPicker/
│   │   │   │   ├── OptionGroup.tsx
│   │   │   │   └── OptionCard.tsx
│   │   │   ├── OrderStatusTimeline.tsx
│   │   │   └── ProductCard.tsx
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   └── client.ts    ← axios instance with Authorization header
│   │   │   └── hooks/
│   │   │       ├── useOrderPolling.ts   ← TanStack Query, polls /orders/:id every 30s
│   │   │       └── useAuth.ts
│   │   ├── store/
│   │   │   ├── index.ts             ← Redux configureStore
│   │   │   └── slices/
│   │   │       ├── auth.slice.ts    ← auth state (user, token, must_change_password)
│   │   │       └── cart.slice.ts    ← local cart UI state
│   │   ├── App.tsx              ← React Router v6 routes
│   │   └── main.tsx             ← Vite entry point
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
├── API-CONVENTION.md
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── API-SPEC.md
    └── UI-FLOWS.md
```

---

## 5. Architecture Decision Records (ADRs)

### ADR-001: Monolith-first over microservices

**Decision:** Start with a single backend application.

**Rationale:**
- 2-person team cannot maintain deployment pipelines for 5+ services
- Monolith with clear module boundaries achieves the same code organization goal
- When/if a service must scale (e.g., order processing), extract it as one targeted operation

**Consequence:** Module boundaries must be strictly enforced now. No cross-module direct DB access — only through service functions. This makes future extraction safe.

**Cross-module atomic operations (checkout and other multi-module transactions):**
The checkout transaction spans `orders`, `cart`, and `payments` modules. The `orders` service acts as the **transaction coordinator**: it begins a pgx transaction, wraps it with `db.New(tx)` to get a transactional `*db.Queries`, then passes it to other modules' service functions that accept `*db.Queries` as a parameter.

```go
// internal/orders/service.go — only this file begins a pgx transaction for checkout
func (s *Service) Checkout(ctx context.Context, req CheckoutRequest) (*db.Order, error) {
    tx, err := s.pool.Begin(ctx)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback(ctx)

    qtx := db.New(tx) // transactional queries

    order, err := qtx.CreateOrder(ctx, db.CreateOrderParams{...})
    if err != nil {
        return nil, err
    }
    if err := qtx.CreateOrderItems(ctx, ...); err != nil {
        return nil, err
    }
    if err := qtx.ClearCart(ctx, req.CartID); err != nil {
        return nil, err
    }
    if err := qtx.CreateOrderPayment(ctx, order.ID); err != nil {
        return nil, err
    }
    return &order, tx.Commit(ctx)
}
```

**Rules:**
- Only coordinator services (`orders.service`) may begin a pgx transaction.
- All other service functions that participate in a transaction accept `*db.Queries` and use it instead of their own queries handle.
- No service may begin a nested transaction.

**Enforcement mechanism:** Go's `internal/` directory prevents external packages from importing internal code, but within the same module all `internal/*` packages can import each other. Enforcement is therefore by convention: each module only exports its `Service` struct (via `New*Service` constructor) — handler and repository files are never imported directly from outside the module. Code review enforces this boundary.

**Reconsider if:** Order processing p95 latency exceeds 1s under 50 concurrent checkouts, OR team grows beyond 3 engineers, OR two modules need independent deployment cadences.

---

### ADR-002: PostgreSQL over NoSQL

**Decision:** PostgreSQL as the sole data store.

**Rationale:**
- Order and payment data is highly relational with strict consistency requirements
- JSONB columns (`selected_options_snapshot`, `operating_hours`) give document flexibility where needed
- sqlc generates type-safe Go functions from SQL queries; pgx v5 provides the driver and connection pool

**Consequence:** Caching layer (Redis) deferred to post-project if performance becomes an issue.

**Reconsider if:** Product catalog read latency exceeds 200ms on branch listing. (Note: session invalidation uses `token_version` on the `users` row — no Redis required for this use case.)

---

### ADR-003: Payment gateway behind an interface

**Decision:** All payment logic goes through a `PaymentGateway` interface with swappable implementations.

```go
// internal/payments/gateway/gateway.go

type PaymentMetadata struct {
    OrderID     uint
    Description string
}

type PaymentResult struct {
    TransactionID string
    Status        string // "COMPLETED" | "FAILED" | "PENDING"
}

type RefundResult struct {
    RefundID string
    Status   string
}

// PaymentGateway is implemented by MockGateway (Phase 1)
type PaymentGateway interface {
    Charge(ctx context.Context, amount int64, meta PaymentMetadata) (*PaymentResult, error)
    Refund(ctx context.Context, transactionID string, amount int64) (*RefundResult, error)
    QueryStatus(ctx context.Context, gatewayRef string) (*PaymentResult, error) // for reconciliation
}

// RedirectPaymentGateway is implemented by VNPay/Momo adapters (Phase 2)
// MockGateway does NOT implement this interface.
type RedirectPaymentGateway interface {
    PaymentGateway
    BuildRedirectURL(ctx context.Context, amount int64, meta PaymentMetadata) (string, error)
    VerifyCallback(ctx context.Context, payload []byte, signature string) (*PaymentResult, error)
}
```

**Rationale:**
- Mock gateway used in Phase 1 (unblocks entire order flow immediately)
- VNPay/Momo adapter dropped in Phase 2 without changing order service
- Tests can inject the mock implementation

**Consequence:** Payment service never calls gateway SDKs directly — only through this interface.

**Phase 2 note:** VNPay and Momo use redirect-based flows (customer redirected to gateway; gateway sends a signed webhook callback). `MockGateway` implements only `PaymentGateway`. Phase 2 adapters implement `RedirectPaymentGateway`. Inbound callback signature verification (`VerifyCallback`) is mandatory to prevent forged payment success webhooks.

---

### ADR-004: Options as structured data (pizza-model), not free text

**Decision:** All product customization is via predefined `ProductOption` records, including cake decorations.

**Rationale:**
- Free-text custom orders require human interpretation and are error-prone
- Structured options enable price calculation, inventory planning, and staff clarity
- Decoration options (themes, colors, add-ons) provide sufficient personalization within bounded scope

**Consequence:** The CUSTOM product category has a rich set of option groups seeded by staff/admin. The inscription field (max 30 chars) is the only free-text element.

---

### ADR-005: Polling over WebSockets for order status updates

**Decision:** Frontend polls `GET /orders/:id` every 30 seconds.

**Rationale:**
- WebSocket adds infrastructure complexity (connection management, auth over WS)
- 30-second polling is acceptable for a school project
- Zero added server complexity

**Consequence:** Order status is not truly real-time. Acceptable for v1. SSE or WebSocket can replace the polling hook in v2 with zero backend changes needed.

**Reconsider if:** User research shows customers frequently miss status changes because of the 30s delay, or load testing shows polling hammering the DB under 50+ concurrent active orders.

**Rate limiting note:** At 50 concurrent active orders the 30s polling cycle generates ~100 req/min on `GET /orders/:id` from legitimate clients alone. This endpoint must be added to the rate limit configuration in §11 Security Controls once baseline polling load is measured in Sprint 5.

**Implementation note:** `useOrderPolling` uses TanStack Query's `useQuery` with `refetchInterval: 30000` inside a React component.

---

### ADR-006: Snapshot pattern for order items

**Decision:** `order_items` stores a full JSON snapshot of selected options and prices at checkout time.

**Rationale:**
- Product prices and options change over time
- An order must reflect what the customer paid for, regardless of future catalog changes
- Reference to `product_id` remains for analytics, but is treated as a soft link

**Consequence:** Order item data is immutable after creation. Any price recalculation requires creating a new order.

---

## 6. Database Index Strategy

Indexes are declared in `sql/schema.sql` alongside the `CREATE TABLE` statements and applied when the schema is first loaded.

### Required Indexes

| Table | Columns | Query it serves |
|---|---|---|
| `orders` | `(branch_id, status)` | Staff dashboard order queue |
| `orders` | `(user_id, created_at DESC)` | Customer order history |
| `orders` | `(status, created_at)` | Auto-cancel cron job |
| `order_items` | `(order_id)` | Fetch items for an order |
| `cart_items` | `(cart_id)` | Fetch cart contents |
| `products` | `(branch_id, is_available)` | Customer catalog listing |
| `product_option_groups` | `(product_id)` | Fetch options for a product |
| `product_options` | `(group_id)` | Fetch options per group |
| `notifications` | `(user_id, is_read)` | Unread notification count |
| `order_payments` | `(order_id)` | Fetch payment for an order |
| `branch_staff` | `(user_id)` | Look up which branch a staff belongs to |
| `branch_staff` | `(branch_id)` | Look up all staff for a branch (admin UI) |
| `carts` | `(user_id)` | Cart lookup by user (hot path on every authenticated request) |
| `products` | `(category)` | Admin top-products report |
| `orders` | `(branch_id, created_at DESC)` | Admin per-branch revenue report with date range filter |

### Unique Constraints (data integrity, not just performance)

| Table | Columns | Reason |
|---|---|---|
| `order_payments` | `(order_id)` WHERE `status != 'FAILED'` | One active payment per order; failed rows retained for audit |
| `carts` | `(user_id)` | One active cart per user |
| `branch_staff` | `(user_id)` | Staff belongs to exactly one branch |

---

## 7. Transaction Boundaries

These operations MUST use a pgx transaction (`pool.Begin` → `db.New(tx)` → `tx.Commit`). A partial write here leaves the database in a corrupt state.

### Checkout (most critical)
```
tx, _ := pool.Begin(ctx)
qtx := db.New(tx)
  1. qtx.CreateOrder(ctx, ...)        ← insert orders
  2. qtx.CreateOrderItems(ctx, ...)   ← insert order_items (snapshot)
  3. qtx.ClearCart(ctx, ...)          ← delete cart_items
  4. qtx.CreateOrderPayment(ctx, ...) ← insert order_payments (status PENDING)
tx.Commit(ctx)
```
If any step fails: entire transaction rolls back. Customer is not charged, order is not created.

**Payment charge/DB consistency:** The `Charge()` call to the gateway adapter occurs *outside* the transaction (gateways do not participate in DB transactions). The sequence is: (1) run the transaction to create the order and payment record with status `PENDING`, (2) call `gateway.Charge()`, (3) update `order_payments.status` to `COMPLETED` or `FAILED`. If step 3 fails after a successful charge, an idempotent reconciliation job must detect orphaned `PENDING` payments older than 5 minutes and query the gateway for their status via `gateway.QueryStatus(transactionID)`.

---

## 8. Error Handling Specification

### AppError Shape
```go
// pkg/apperror/apperror.go
type AppError struct {
    Code       string         `json:"-"`
    Message    string         `json:"message"`
    StatusCode int            `json:"-"`
    Context    map[string]any `json:"-"` // internal only, never sent to client
}

func (e *AppError) Error() string { return e.Message }

// Predefined errors
var (
    ErrNotFound     = &AppError{Code: "NOT_FOUND",     Message: "Resource not found",            StatusCode: 404}
    ErrUnauthorized = &AppError{Code: "UNAUTHORIZED",  Message: "Authentication required",        StatusCode: 401}
    ErrTokenInvalid = &AppError{Code: "TOKEN_INVALID", Message: "Token is invalid or expired",   StatusCode: 401}
    ErrForbidden    = &AppError{Code: "FORBIDDEN",     Message: "Insufficient permissions",       StatusCode: 403}
)
```

### What Gets Logged vs. Returned to Client

| Error type | Log level | Logged fields | Client response |
|---|---|---|---|
| Validation error (4xx) | `warn` | code, path, requestId | `{ error: { code, message } }` |
| Business rule violation (409, 422) | `warn` | code, userId, requestId | `{ error: { code, message } }` |
| Unexpected server error (5xx) | `error` | full stack, requestId, userId | `{ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }` |
| DB connection error | `fatal` | error message, timestamp | `{ error: { code: "SERVICE_UNAVAILABLE" } }` |

**Rule:** Stack traces, SQL errors, and internal context NEVER appear in client responses. Log them server-side with a `requestId` so they can be correlated.

**Background job errors:** robfig/cron jobs (auto-cancel) have no `requestId`. They use a `jobId` (job name + timestamp) for log correlation. Failures are logged at `error` level with the `jobId` and failing record IDs. Each job retries once after 5 minutes on failure, then logs `fatal` and alerts via the notification service to admin users.

### Request ID
Every request gets a UUID (`requestId`) injected by middleware at the top of the chain. All log lines for that request include the `requestId`. This allows correlating a user-reported error to a specific log entry.

```go
// internal/middleware/request_id.go
func RequestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := uuid.New().String()
        ctx := context.WithValue(r.Context(), RequestIDKey, id)
        w.Header().Set("X-Request-Id", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Health Check Endpoint
```
GET /health   [PUB]
→ 200: { "status": "ok", "db": "connected", "timestamp": "..." }
→ 503: { "status": "degraded", "db": "disconnected" }
```
Required for Docker health checks and deployment readiness probes.

---

## 9. Schema Management

The database schema is defined in `sql/schema.sql`. Run it once to initialize a fresh database:

```bash
psql $DATABASE_URL < sql/schema.sql
```

sqlc reads `sql/schema.sql` to validate query files and generate type-safe Go code. Run `sqlc generate` after any change to schema or query files.

**Rules for this project:**

| Rule | Why |
|---|---|
| Never edit files in `/db/` directly | They are regenerated by `sqlc generate` and changes will be overwritten |
| Schema changes require updating `sql/schema.sql` and re-running `sqlc generate` | sqlc and the DB must stay in sync |
| New columns must be nullable or have a DEFAULT | Existing rows must satisfy the new schema on next `psql < schema.sql` |
| Partial unique indexes (e.g., `WHERE status != 'FAILED'`) must be written in `schema.sql` | These cannot be expressed in sqlc annotations — write them as raw SQL |

---

## 10. Canonical Order Status FSMs

> **Single source of truth.** PRD.md and API-SPEC.md reference this section.

> **Note:** The Custom Order FSM is deferred to the backlog and is not part of v1 scope.

### Standard Order FSM

```
PENDING_CONFIRMATION ──(staff confirms, ≤15min)──► CONFIRMED
PENDING_CONFIRMATION ──(timeout / staff rejects)──► CANCELLED

CONFIRMED ──(staff action)──► PREPARING
PREPARING ──(staff action)──► READY_FOR_PICKUP
READY_FOR_PICKUP ──(delivery staff action)──► PICKED_UP
PICKED_UP ──(delivery staff action)──► OUT_FOR_DELIVERY
OUT_FOR_DELIVERY ──(delivery staff action)──► DELIVERED  ✓ terminal

CONFIRMED | PREPARING | READY_FOR_PICKUP | PICKED_UP ──(admin force cancel)──► CANCELLED  ✓ terminal
```

> **v1 delivery model:** The ASSIGNED state is removed for v1 (no delivery assignment pool). Delivery staff see READY_FOR_PICKUP orders and directly advance them to PICKED_UP. The ASSIGNED state can be re-added in v2 when the delivery pool feature is implemented.

### Notification Events Triggered per Transition

| Transition | Notified party | Event code |
|---|---|---|
| → CONFIRMED | Customer | `ORDER_CONFIRMED` |
| → CANCELLED | Customer | `ORDER_CANCELLED` |
| → PREPARING | Customer | `ORDER_PREPARING` |
| → READY_FOR_PICKUP | All delivery staff (broadcast) | `ORDER_READY_FOR_PICKUP` |
| → PICKED_UP | — | **No notification — intentional** |
| → OUT_FOR_DELIVERY | Customer | `ORDER_OUT_FOR_DELIVERY` |
| → DELIVERED | Customer | `ORDER_DELIVERED` |
| Timeout approaching (10min) | Staff | `ORDER_CONFIRM_REMINDER` |

---

## 11. Security Controls

| Layer | Control |
|---|---|
| Transport | HTTPS in production (enforced at reverse proxy) |
| Auth | JWT (HS256), 7-day expiry, secret from env |
| Session revocation | `token_version INT DEFAULT 0` on `users`. Incremented on password change or "logout all other sessions". Middleware checks `jwt.token_version === user.token_version`; mismatch returns `401 TOKEN_INVALID`. Current session always survives — only other sessions are invalidated. |
| Authorization | Role enum checked per route via `Authorize()` middleware |
| Input | go-playground/validator v10 struct tag validation on every request body |
| SQL | sqlc generates all queries from `sql/queries/*.sql` — no dynamic query construction is possible in generated code. The only hand-written SQL is in `sql/schema.sql` (DDL) and any `pool.QueryRow()` calls in service layer, which must use `$1`/`$2` positional parameters — never string concatenation. |
| Secrets | `.env` only, never committed. `.env.example` committed with placeholders |
| Passwords | golang.org/x/crypto/bcrypt, cost factor 12 |
| JWT storage | JWT stored in `localStorage`. Go backend returns the token in the login response body; React stores it and attaches it as `Authorization: Bearer <token>` on every API request via the axios client interceptor. For production, prefer httpOnly cookies set by the backend — but localStorage is acceptable for this project scope. |
| Password validation | Enforced via validator struct tags on `POST /auth/register` and `PATCH /me/password`: minimum 8 characters, at least 1 uppercase letter, at least 1 number (PRD AUTH-09). |
| Forced password change | Seeded STAFF and DELIVERY_STAFF accounts have `must_change_password = true`. Login response includes `"must_change_password": true`. All endpoints except `PATCH /me/password` return `403 MUST_CHANGE_PASSWORD` until the user changes their password. Password change clears the flag and increments `token_version`. |
| Payment webhooks (Phase 2) | Inbound VNPay/Momo callbacks must be verified via HMAC signature (`VerifyCallback()` on the gateway adapter) before any order status is advanced. Unsigned callbacks are rejected with `403`. |
| CORS | `CORS_ORIGIN` env var is **P0** — app must refuse to start if unset in production. Configured via Gin CORS middleware before all route handlers. |
| Rate limiting | tollbooth or x/time/rate Chi middleware, per-IP and per-user-JWT. Routes and limits: POST /auth/login (10 req/min), POST /auth/register (10 req/min), POST /orders (20 req/min), POST /cart/items (60 req/min), GET /orders/:id (120 req/min per user — accommodates 30s polling for up to 4 concurrent active orders per user), POST /payments/* (20 req/min) |

---

## 12. Environment Variables

All required env vars. App must panic at startup if any P0 var is missing (godotenv load + manual validation check).

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | P0 | `postgresql://user:pass@localhost:5432/bakerio` | GORM connection string (postgres://...) |
| `JWT_SECRET` | P0 | 64-char random string | Min 32 chars. Rotate to invalidate all sessions. |
| `PORT` | P0 | `3000` | Backend listen port |
| `APP_ENV` | P0 | `development` / `production` | Controls error verbosity |
| `BCRYPT_ROUNDS` | P1 | `12` | Default 12. Lower in test env for speed. |
| `CORS_ORIGIN` | P0 | `http://localhost:3001` | Frontend origin. App must fail to start in production if unset. |
| `AUTO_CANCEL_INTERVAL_SECS` | P1 | `60` | How often cron runs (default 60s); parsed with time.Duration |
| `AUTO_CANCEL_TIMEOUT_MINS` | P1 | `15` | Minutes before unconfirmed order is auto-cancelled |
| `DELIVERY_FEE` | P1 | `20000` | Flat delivery fee in VND (integer — VNĐ has no subunit). All monetary DECIMAL columns must be `DECIMAL(15, 0)` to prevent rounding errors in percentage discount calculations. |

---

## 13. Scalability Path (Post-Project)

When the monolith needs to scale, the extraction order is:

1. **Order service** — highest write load, extract first
2. **Notification service** — already isolated, easiest to extract
3. **Product catalog** — high read load, can add CDN caching
4. **Payment service** — already behind interface, straightforward to isolate
5. **Auth service** — extract last (most cross-cutting)

Each module's strict boundary (no cross-module DB access) makes this extraction safe without rewrites.

---

*Architecture maintained by: Bakerio dev team*
