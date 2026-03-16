# Bakerio — Business Plan

> E-Commerce Platform for Sweet Goods | Modulithic Go | 2-person team | 2.5 months (10 weeks)
> Last updated: 2026-03-16
> Capacity: 3h/day × 4 days/week × 2 people = **24 person-hours/week** (~240 hrs total)

### Design Documents
| Document | Purpose |
|---|---|
| [PRD.md](docs/PRD.md) | What to build — features, NFRs, constraints |
| [SRS.md](docs/SRS.md) | Full requirements specification — functional, non-functional, data, constraints |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How to build it — modules, ADRs, directory structure |
| [API-SPEC.md](docs/API-SPEC.md) | All REST endpoints with request/response shapes |
| [UI-FLOWS.md](docs/UI-FLOWS.md) | Screen layouts, interaction patterns, component design |
| [TEST-PLAN.md](docs/TEST-PLAN.md) | Test strategy, test cases, E2E flows, regression checklist |
| [FIGMA-TO-FRONTEND.md](docs/FIGMA-TO-FRONTEND.md) | Designer brief, Figma requirements, and Figma → React handoff workflow |
| [DESIGN-BRIEF.md](docs/DESIGN-BRIEF.md) | Full Figma setup guide — tokens, screen order, UX principles, handoff checklist |
| [COMPONENT-SPEC.md](docs/COMPONENT-SPEC.md) | Exact spec for every UI component — dimensions, states, tokens, rules |
| [DESIGN-AGENT-GUIDE.md](docs/DESIGN-AGENT-GUIDE.md) | AI agent reference — decided constraints, complex feature walkthroughs, escalation rules |

---

## 1. Project Overview

Bakerio is a multi-branch sweet goods ordering platform modeled on the Domino's/pizza-chain delivery model. In v1, customers browse a branch's catalog, configure standard products, place orders, and pay online. Branch staff manage inventory and order preparation, delivery staff handle batch dispatch runs for their assigned branch, and admins manage the entire system.

### Core Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Monolith-first, modular | Reduces early complexity; structured for future microservice extraction |
| Delivery | Internal branch-assigned delivery staff + batch dispatch cron | Full control over status tracking with simpler operations than per-order assignment |
| Custom Orders | Pizza-model (structured options) | Bounded scope; no free-form text, no premium gating |
| Payment | Mock placeholder → real gateway | Ship faster; swap VNPay/Momo in later sprint without logic changes |
| Auth | JWT + RBAC (4 roles: Customer, Staff, Delivery Staff, Admin) | Industry standard; cleanly separates production prep from batch delivery runs |

---

## 2. Business Model & Market Opportunity

### What Bakerio Is

Bakerio is an **internal ordering and operations platform built for a single bakery chain** — one company running 10+ physical branches across a city. It is not a marketplace or SaaS product; it is purpose-built for this chain to replace Zalo/phone-based order management with a unified digital storefront and branch operations tool.

### Market Context

Vietnam's food delivery market grew sharply post-2020, but general platforms (GrabFood, ShopeeFood) are optimized for fast food — not sweet goods. Cakes and pastries are **occasion-driven, high-margin, and require advance scheduling** that generic platforms don't support. The chain currently manages orders through Zalo, Facebook Messenger, or phone — fragmented, error-prone, and unscalable across 10+ branches.

### Target Users

| Segment | Profile | Pain Point |
|---|---|---|
| **Chain operations** | 10+ branches with shared admin oversight | No unified order view; each branch manages Zalo DMs independently; no real-time inventory or status tracking |
| **End customers** | Urban Vietnamese, 18–35, ordering for birthdays/celebrations | Must call or DM to order; no online checkout, no order tracking |

### Revenue Model

Bakerio generates revenue directly for the chain — not via platform commission. The chain owns the platform.

| Stream | Mechanism | Notes |
|---|---|---|
| Product sales | Customer pays full order amount online | Replaces cash-on-delivery and manual payment collection |
| Delivery fee | 20,000₫ flat fee charged to customer | Covers delivery labor cost; net ~5,000₫ contribution after ~15,000₫ fulfillment/delivery payout |
| Custom order deposit *(v2)* | % of total held at booking; retained on late cancellation | Reduces no-show risk on high-effort custom cakes |

### Unit Economics (Illustrative)

> Assumptions: AOV 150,000₫, fulfillment/delivery payout ~15,000₫, net delivery contribution ~5,000₫. v1 standard orders only.

| Metric | Value |
|---|---|
| Average order value (AOV) | 150,000₫ |
| Delivery fee (gross) | 20,000₫ |
| Fulfillment/delivery payout | ~15,000₫ |
| **Net delivery contribution** | **~5,000₫/order** |
| Digital order vs. Zalo admin time saved | ~8–10 min/order @ 50,000₫/hr = ~7,000–8,000₫ saved |

### Operational Value vs. Status Quo

The chain's current Zalo workflow costs approximately 8–10 minutes of staff time per order for DM handling, design confirmation, payment reconciliation, and delivery coordination. At a staff rate of ~50,000₫/hr, that is ~7,000–8,000₫ of hidden labor per order — not counting errors, missed messages, and the impossibility of centralized reporting across 10+ branches.

Bakerio eliminates this overhead: customers self-serve checkout, payments are captured online, and staff work from a single order dashboard instead of individual chat threads.

### Go-to-Market Strategy

**Phase 1 — Internal rollout**
Deploy to all branches. Staff training ~2h per branch. The chain's existing customer base (Zalo followers, repeat buyers) is directed to the new online storefront.

**Phase 2 — Customer-led growth**
Branches promote their Bakerio storefront links via existing social media. Zero B2C ad spend in v1 — leverage the chain's existing audience.

**Phase 3 — Feature expansion (post-assessment)**
Voucher/promotion system (already designed), custom cake builder (v2), and admin analytics to optimize branch performance.

### Why Not Just Use GrabFood or Zalo?

| Ordering channel | Chain control | Branch ops dashboard | Online payment | Advance scheduling | Order tracking |
|---|---|---|---|---|---|
| GrabFood / ShopeeFood | ❌ Platform-owned | ❌ | ✅ | ❌ | ✅ Limited |
| Facebook / Zalo DMs | ✅ | ❌ Manual per branch | ❌ Cash/transfer | ✅ Informal | ❌ |
| **Bakerio (v1)** | ✅ Chain-owned | ✅ Unified dashboard | ✅ | ✅ | ✅ Full FSM |

**Why build instead of using existing platforms:** GrabFood takes ~25–30% commission and gives the chain no operational visibility. Zalo is free but doesn't scale across 10+ branches and has no checkout, inventory tracking, or reporting. Bakerio gives the chain full ownership of the customer relationship, order data, and operations tooling — at the cost of building and maintaining it.

---

## 3. User Roles

| Role | Core Responsibility |
|---|---|
| **Customer** | Browse catalog, build cart, place & pay for orders, track delivery |
| **Staff** | Manage branch product catalog, confirm standard orders, and advance fulfillment up to `READY_FOR_PICKUP` |
| **Delivery Staff** | Receive branch dispatch notifications, pick up all pending `READY_FOR_PICKUP` orders in one run, and advance each order through delivery statuses |
| **Admin** | Manage branches and staff accounts |

---

## 4. User Stories

### 3.1 Customer

---

**US-C01 — Browse catalog by branch**
> As a customer, I want to browse products from a specific branch so I can see what's available near me.

Acceptance Criteria:
- [ ] Customer can view a list of branches with address and operating hours
- [ ] Selecting a branch shows its active product catalog (available items only)
- [ ] Products display name, image, price, and available customization options
- [ ] Unavailable products are visually marked(grayed out) but still visible

---

**US-C02 — Configure a standard product**
> As a customer, I want to select product options (size, flavor, quantity) before adding to cart.

Acceptance Criteria:
- [ ] Each product has predefined option groups (e.g., Size: S/M/L; Flavor: Chocolate/Vanilla)
- [ ] Customer must complete all required option groups before adding to cart
- [ ] Price updates dynamically as options are selected
- [ ] Customer can set quantity (min 1)

---

**US-C03 — Configure a custom product (pizza-model) *(Deferred to v2)***
> As a customer, I want to build a custom cake by choosing from structured options so I can personalize my order without free-form inputs.

Acceptance Criteria:
- [ ] Custom product has structured option groups: Size, Base Flavor, Frosting, Color Palette, Decoration Theme, Add-on Decorations (multi-select: roses/gold leaf/sprinkles/fruit/macarons/fondant figures/candles), Candle Style, Writing Style, Inscription (max 30 chars)
- [ ] Full decoration option definitions in [PRD.md §4.4](docs/PRD.md) (open to changes)
- [ ] Each selectable option has a name, image, and price delta
- [ ] Total price is calculated from base price + sum of selected option deltas
- [ ] Customer sets desired delivery date (minimum 48h in advance)
- [ ] Should reflect branch's inventory status (grayed out if no stock is available)
- [ ] Customer sees a summary of all selections before adding to cart

---

**US-C04 — Manage cart**
> As a customer, I want to review, edit, and remove items in my cart before checkout.

Acceptance Criteria:
- [ ] Cart shows all items with selected options, quantity, and line total
- [ ] Customer can change quantity or remove an item
- [ ] Cart persists across sessions (stored server-side, linked to account)
- [ ] Cart locked to a single branch — adding item from different branch prompts remove if unavailable/migrate if available choices

---

**US-C05 — Apply a voucher *(Deferred to v2)***
> As a customer, I want to apply a voucher code at checkout to receive a discount.

Acceptance Criteria:
- [ ] Voucher code input shown on checkout summary page
- [ ] System validates: code exists, not expired, not yet used by this customer, minimum order met
- [ ] Discount (fixed amount or percentage) applied and shown before payment
- [ ] Invalid code shows specific error (expired / already used / minimum not met)
- [ ] Only one voucher per order

---

**US-C06 — Checkout and pay**
> As a customer, I want to confirm my order and pay so the branch can start preparing it.

Acceptance Criteria:
- [ ] Checkout shows: order summary, delivery address, estimated total, delivery fee, final amount
- [ ] Customer confirms delivery address (pre-filled from profile, editable)
- [ ] Customer can note delivery instructions
- [ ] Payment via mock gateway in Phase 1; VNPay/Momo in Phase 2
- [ ] On successful payment: Order record created with status `PENDING_CONFIRMATION`
- [ ] Customer receives order confirmation with order ID

---

**US-C07 — Track order status**
> As a customer, I want to see my order's current status so I know when it will arrive.

Acceptance Criteria:
- [ ] Order detail page shows status timeline: Pending → Confirmed → Preparing → Ready for Pickup → Out for Delivery → Delivered
- [ ] Status updates reflected in real-time (polling acceptable for v1)
- [ ] Branch contact information shown on the order detail page for delivery-related questions
- [ ] Customer notified on each status change (in-app notification, v1)

---

**US-C08 — Write a review *(Deferred to v2)***
> As a customer, I want to rate and review a product or branch after my order is delivered.

Acceptance Criteria:
- [ ] Review prompt appears after order reaches `DELIVERED` status
- [ ] Customer can rate (1–5 stars) and optionally add a text comment
- [ ] One review per order per product
- [ ] Reviews visible publicly on product/branch page
- [ ] Customer cannot review before delivery is confirmed

---

**US-C09 — View order history**
> As a customer, I want to see my past orders so I can reorder or track previous purchases.

Acceptance Criteria:
- [ ] List of past orders with date, branch, total, and final status
- [ ] Clicking an order shows full detail and items
- [ ] "Reorder" button pre-fills cart with same items from same branch (availability warning if any item is now unavailable)

---

### 3.2 Staff

---

**US-S01 — Manage product catalog**
> As a branch staff member, I want to add, edit, and manage product inventory so the catalog stays accurate.

Acceptance Criteria:
- [ ] Staff can create a product with: name, description, images, base price, category, option groups
- [ ] Staff can edit any field of an existing product
- [ ] Staff can toggle a product's availability (available/unavailable) without deleting it
- [ ] Staff can set a stock quantity (`stock_qty`) per product; setting to 0 auto-marks it unavailable
- [ ] Staff can set a low-stock threshold (`low_stock_threshold`) per product; a warning badge appears on the dashboard when stock falls at or below this value
- [ ] Each confirmed order automatically decrements `stock_qty` by the ordered quantity; if stock reaches 0, `is_available` is set to false automatically
- [ ] Staff receive an in-dashboard notification when any product hits the low-stock threshold
- [ ] Changes are scoped to the staff's assigned branch only
- [ ] Option groups can be added/removed per product (e.g., add a new size tier)

---

**US-S02 — View and confirm incoming orders**
> As a branch staff member, I want to see new orders and confirm them so customers know their order is being processed.

Acceptance Criteria:
- [ ] Dashboard shows all orders for this branch, sorted by creation time
- [ ] New orders highlighted; staff can confirm within 15 minutes or order auto-cancels
- [ ] Confirming sets status to `CONFIRMED`
- [ ] Staff can add an estimated ready time on confirmation
- [ ] Staff can reject an order with a required reason (customer notified)

---

### 3.3 Staff

---

**US-S03 — Update order fulfillment status**
> As a branch staff member, I want to advance orders through the in-branch preparation stages so they are ready for the next dispatch run.

Acceptance Criteria:
- [ ] Staff can advance order status: `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP`
- [ ] Each transition is logged with timestamp and staff ID
- [ ] Customer notified on each status change

---

**US-S04 — Handle custom orders *(Deferred to v2)***
> As a branch staff member, I want to review custom order specifications and confirm feasibility before production.

Acceptance Criteria:
- [ ] Custom orders appear in a separate "Custom" tab on the dashboard
- [ ] Staff see full structured configuration (all selected options)
- [ ] Staff can confirm or reject with a reason
- [ ] If confirmed: deposit is captured; production begins
- [ ] Staff can update custom order status through the same fulfillment pipeline as standard orders once production begins

---

### 3.4 Delivery Staff

---

**US-D01 — Execute a batch dispatch run**
> As a delivery staff member, I want to receive a branch dispatch notification and then deliver all pending `READY_FOR_PICKUP` orders in one run.

Acceptance Criteria:
- [ ] Delivery staff are assigned to a specific branch
- [ ] A `DISPATCH_READY` notification is sent to delivery staff at that branch when either `READY_FOR_PICKUP` count reaches the branch threshold or the oldest `READY_FOR_PICKUP` order has waited at least the branch timeout
- [ ] Delivery staff can view all current `READY_FOR_PICKUP` orders for their branch in one dispatch queue
- [ ] After physically picking up the batch, delivery staff advances each picked-up order from `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY`
- [ ] Delivery staff marks each order `DELIVERED` individually as drop-offs are completed
- [ ] Each transition is logged with timestamp and delivery staff ID

---

### 3.5 Admin

---

**US-A01 — Manage branches**
> As an admin, I want to create and manage branch records so the platform reflects the company's physical footprint.

Acceptance Criteria:
- [ ] Admin can create a branch with: name, address, coordinates, operating hours, phone
- [ ] Admin can configure branch dispatch settings: `dispatch_threshold` and `dispatch_timeout_minutes`
- [ ] Admin can edit or deactivate a branch
- [ ] Deactivated branches hidden from customer catalog
- [ ] Each branch has a unique ID referenced by staff and orders

---

**US-A02 — Manage staff accounts**
> As an admin, I want to create and manage staff accounts per branch so access is properly controlled.

Acceptance Criteria:
- [ ] Admin can create accounts for the `STAFF` role
- [ ] Admin can create accounts for the `DELIVERY_STAFF` role
- [ ] All accounts are assigned to a specific branch
- [ ] Admin can deactivate accounts without deleting them
- [ ] Role cannot be changed after creation without explicit admin action

---

**US-A03 — Manage promotions and vouchers *(Deferred to v2)***
> As an admin, I want to create voucher codes and promotions so customers are incentivized to order.

Acceptance Criteria:
- [ ] Admin can create a voucher: code, discount type (fixed/percentage), discount value, min order value, expiry date, usage limit (system-wide count, personal count and/or system-wide budget)
- [ ] Vouchers can be scoped to a specific branch or system-wide
- [ ] Admin can deactivate a voucher before expiry
- [ ] Dashboard shows usage count per voucher

---

**US-A04 — View reports and analytics *(Deferred to v2)***
> As an admin, I want to see revenue and order metrics so I can monitor performance across branches.

Acceptance Criteria:
- [ ] Dashboard shows: total orders, total revenue, orders by branch, top products by volume
- [ ] Date range filter (last 7d / 30d / custom)
- [ ] Per-branch breakdown available as drill-down
- [ ] Data exportable to CSV (v2)

---

## Backlog (Deferred to v2)

> These features are fully designed and documented but deferred from v1 implementation. They can be picked up after the core flow is stable.

- **Custom Order Flow (§4.8 in PRD):** US-C03, US-S04 — custom cake builder, deposit payment, custom order FSM
- **Vouchers & Promotions (§4.10 in PRD):** US-C05, US-A03 — voucher CRUD, validation, race-condition-safe usage
- **Reviews (§4.11 in PRD):** US-C08, US-A04 — review submission, ratings, average computation
- **Admin Reports (ADMIN-04, ADMIN-05):** order/revenue analytics, date range filters

---

## 5. Data Model

### Entity-Relationship Summary

```
User ──────────────────────────── BranchStaff
  │ (customer)                         │
  │                                  Branch ──── Product ──── ProductOptionGroup
  │                                                                    │
  ├── Cart ──── CartItem                                      ProductOption
  │               │ (references Product + selected options)
  │
  ├── Order ──── OrderItem ──── (snapshot of Product + options at order time)
  │       │
  │       └── OrderPayment
  │
  └── Notification
```

Branch also stores batch dispatch configuration used by the delivery cron job: `dispatch_threshold` and `dispatch_timeout_minutes`. `BranchStaff` links both `STAFF` and `DELIVERY_STAFF` users to one branch; no `delivery_assignments` table is required because dispatch is branch-level, not order-level.

### Table Definitions

> **Monetary columns:** All `DECIMAL` columns storing currency values must be declared as `DECIMAL(15, 0)` in `sql/schema.sql` (VNĐ is an integer currency with no subunit). This prevents floating-point rounding errors in order pricing arithmetic. The `total_amount` arithmetic CHECK constraint relies on this — all intermediate calculations must be rounded to the nearest VNĐ before insert.

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR UNIQUE | |
| password_hash | VARCHAR | |
| full_name | VARCHAR | |
| phone | VARCHAR | |
| address | TEXT | default delivery address |
| role | ENUM | `CUSTOMER`, `STAFF`, `DELIVERY_STAFF`, `ADMIN` |
| must_change_password | BOOLEAN | default false; true for pre-seeded branch staff, delivery staff, and admin accounts on first login |
| is_active | BOOLEAN | default true |
| token_version | INT | default 0; increment to invalidate all sessions |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `branches`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | |
| address | TEXT | |
| lat | DECIMAL | |
| lng | DECIMAL | |
| phone | VARCHAR | |
| operating_hours | JSONB | `{ mon: "08:00-22:00", ... }` |
| dispatch_threshold | INT | default 3; batch dispatch fires when `READY_FOR_PICKUP` count reaches this value |
| dispatch_timeout_minutes | INT | default 60; batch dispatch also fires when oldest `READY_FOR_PICKUP` order reaches this age |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraints:** `CHECK (dispatch_threshold > 0)` and `CHECK (dispatch_timeout_minutes > 0)`.

#### `branch_staff`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | role must be `STAFF` or `DELIVERY_STAFF` |
| branch_id | UUID FK → branches | |
| assigned_at | TIMESTAMP | |

#### `products`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID FK → branches | product belongs to one branch |
| name | VARCHAR | |
| description | TEXT | |
| base_price | DECIMAL | |
| category | ENUM | `CAKE`, `COOKIE`, `PASTRY` |
| is_available | BOOLEAN | auto-set to false when stock_qty reaches 0 |
| stock_qty | INT | 0 = out of stock |
| low_stock_threshold | INT | NULL = no alert; staff alerted when stock_qty ≤ this value |
| image_url | VARCHAR | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `product_option_groups`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| product_id | UUID FK → products | |
| name | VARCHAR | e.g. "Size", "Frosting" |
| min_select | INT | default 0; set to 1 to make group required |
| max_select | INT | nullable = unlimited; 1 = single-select; >1 or null = multi-select |
| sort_order | INT | |

**Constraint:** `CHECK (max_select IS NULL OR max_select >= min_select)` — prevents logically invalid groups (e.g., min=3, max=1). A group is effectively multi-select when `max_select IS NULL OR max_select > 1`.

#### `product_options`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| group_id | UUID FK → product_option_groups | |
| name | VARCHAR | e.g. "Large", "Chocolate" |
| price_delta | DECIMAL | added to base price |
| image_url | VARCHAR | nullable |
| is_available | BOOLEAN | |
| sort_order | INT | |

#### `carts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| branch_id | UUID FK → branches | cart locked to one branch |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraint:** `UNIQUE(user_id)` — one active cart per user. Prevents race condition where two browser tabs simultaneously create separate cart rows.

#### `cart_items`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| cart_id | UUID FK → carts | |
| product_id | UUID FK → products | |
| quantity | INT | |
| selected_options | JSONB | array of option IDs |
| unit_price | DECIMAL | recomputed and synced to DB at checkout page load; re-validated at checkout submit |

**Constraint:** `CHECK (quantity > 0)` on quantity column.

#### `orders`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| branch_id | UUID FK → branches | |
| status | ENUM | see [ARCHITECTURE.md §10](docs/ARCHITECTURE.md) — canonical FSM |
| delivery_address | TEXT | snapshot at order time |
| subtotal | DECIMAL | sum of all line_totals before delivery fee |
| delivery_fee | DECIMAL | default 20000 (₫), configurable via env |
| total_amount | DECIMAL | subtotal + delivery_fee |
| estimated_ready_at | TIMESTAMP | set by staff on confirm |
| rejection_reason | TEXT | nullable; free text set on staff or auto rejection |
| cancelled_at | TIMESTAMPTZ | nullable; set atomically by auto-cancel job as idempotency key — prevents double-cancel on job restart |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Order Status FSM:** `PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED` (plus cancellation/rejection paths defined in [ARCHITECTURE.md §10](docs/ARCHITECTURE.md)). `READY_FOR_PICKUP → OUT_FOR_DELIVERY` is performed by `DELIVERY_STAFF` after they pick up the current branch batch.

**Constraint:** `CHECK (total_amount = subtotal + delivery_fee)` — arithmetic consistency enforced at DB level.

#### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID FK → orders | |
| product_id | UUID FK → products | reference only (soft link) |
| product_name | VARCHAR | snapshot |
| selected_options_snapshot | JSONB | full denormalized snapshot: `[{group_id, group_name, option_id, option_name, price_delta}]`; immutable after creation; must include names and prices (not IDs only) so future option deletion never corrupts historical records |
| quantity | INT | |
| unit_price | DECIMAL | locked at checkout |
| line_total | DECIMAL | |

**Constraints:** `CHECK (quantity > 0)` on quantity column. `order_items.selected_options_snapshot` is write-once — updates are forbidden after order creation.

#### `order_payments`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID FK → orders | |
| amount | DECIMAL | |
| method | ENUM | `MOCK`, `VNPAY`, `MOMO` |
| status | ENUM | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| gateway_reference | VARCHAR | nullable; populated after `gateway.charge()` returns. Null = charge not yet initiated. Reconciliation job only processes PENDING rows where `gateway_reference IS NOT NULL`. |
| paid_at | TIMESTAMP | nullable |

**Constraint:** `UNIQUE(order_id) WHERE status != 'FAILED'` — prevents duplicate active payment rows on client retry. Failed rows are retained for audit.

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | recipient |
| event_code | VARCHAR | e.g. `ORDER_CONFIRMED`, `DISPATCH_READY` |
| payload | JSONB | event-specific data (order_id, amount, etc.) |
| is_read | BOOLEAN | default false |
| created_at | TIMESTAMP | |

Notification fan-out happens at write time: one row inserted per recipient via bulk insert. No group-target rows. A cron job runs every 5 minutes and, for each active branch, checks whether `READY_FOR_PICKUP` count is at least `dispatch_threshold` or the oldest `READY_FOR_PICKUP` order age is at least `dispatch_timeout_minutes`; if either condition is met, it emits `DISPATCH_READY` notifications to that branch's `DELIVERY_STAFF` users.

---

## 6. Development Protocol

### Roles

| Who | Owns |
|---|---|
| **Human** | Sprint planning, task decomposition, architecture decisions, logical decisions, code review, test authorship, doc updates |
| **AI** | Body of a single, well-specified function — nothing broader |

### Human Workflow Loop (per coding session)

1. Pick one task from the sprint checklist
2. Read the relevant SRS requirement + API-SPEC endpoint
3. Decompose into atomic subtasks (one function = one clear input/output)
4. Write the function signature and types manually
5. Hand the body to AI **only if** the AI gate passes (see below)
6. Review AI output against SRS, FSM, and snapshot rules
7. Write or update the test case for that function
8. Commit — PR reviewed by both team members

### AI Usage Gate

Before handing anything to AI, ask:
> *"Can I describe this task's input, output, and rules in one sentence?"*

- **Yes** → AI writes the function body. You review it.
- **No** → Decompose further. The task is still too broad.

**Examples:**
- ✅ `computeOrderTotal(subtotal, deliveryFee): number`
- ✅ go-playground/validator struct tags for `POST /orders` request body
- ❌ "Implement the checkout service" — decompose first
- ❌ "Set up the order FSM" — define transitions first, then implement one function at a time

### Logical Decisions (Human Only)

These questions cannot be answered by AI. They must be resolved by the team **before** coding begins for the relevant sprint. Each sprint below has a `⚠️ Decisions Required` block listing open questions. Write your answers in the sprint block before moving on.

---

## 7. Agile Sprint Plan (9 Weeks)

> Team: 2 developers. Each sprint = 1 week.
> Capacity per sprint: 24 person-hours (3h × 4 days × 2 people).
> Start date: 2026-03-13. End date: 2026-05-14 (+ ~1.5 weeks buffer before May 28 deadline).

| Sprint | Week | Dates | Person A | Person B |
|---|---|---|---|---|
| 0 | 1 | Mar 13–19 | Go foundation + schema | Project brief + SRS drafting |
| 1 | 2 | Mar 20–26 | Auth endpoints | SRS completion + Figma setup |
| 2 | 3 | Mar 27–Apr 2 | Branches + Products | Figma: customer flows + React + Vite basics |
| 3 | 4 | Apr 3–9 | Cart | Figma: staff + admin flows + React + Vite basics |
| 4 | 5 | Apr 10–16 | Checkout + payment | Figma DONE + Test plan draft + React:auth |
| 5 | 6 | Apr 17–23 | Staff orders + dispatch jobs | React:product catalog + cart |
| 6 | 7 | Apr 24–30 | Notifications + admin endpoints | React:checkout + order tracking |
| 7 | 8 | May 1–7 | Bug fixes + API polish | React:staff dashboard + admin UI |
| 8 | 9 | May 8–14 | Integration tests + demo prep | Test plan final + test report |

---

### Sprint 0 — Week 1 (Mar 13–19): Foundation
**Goal:** Runnable Go server connected to Postgres. Schema loaded via `sql/schema.sql`. sqlc codegen configured. Both developers oriented in their respective tools.
**Capacity:** 24h.

> ⚠️ **Decisions Required (before coding)**
> - Backend framework: Chi (recommended) or Gin?

> - Frontend: React 18 + Vite 5 confirmed?
> - State management: Redux Toolkit (confirmed)
> - Background job: robfig/cron (recommended)?
> - Delivery fee: fixed 20,000₫ env var or configurable per branch?

**Person A — Go Backend (12h)**
| Task | Est. | Done When |
|---|---|---|
| Go module init + Gin setup + basic server | 2h | `go run ./cmd/api` serves on :8080 |
| pgx connection pool + `pkg/config` (godotenv, panic on missing P0 vars) | 2h | DB connects; missing var causes startup panic |
| `sql/schema.sql` (all tables, indexes, constraints, branch dispatch config) + `sqlc.yaml` + `sqlc generate` | 5h | `psql $DATABASE_URL < sql/schema.sql` creates all tables; `/db/` package generated |
| Docker Compose: Postgres + Go backend + React frontend | 2h | `docker compose up` builds and starts all 3 services |
| `GET /health` endpoint | 0.5h | Returns `{"status":"ok","db":"connected"}` |
| RequestID middleware | 0.5h | Injects UUID into context; sets X-Request-Id header |

**Person B — Docs (12h)**
| Task | Est. | Done When |
|---|---|---|
| Project brief (1–2 pages: problem, solution, tech, team, timeline) | 3h | Document committed |
| SRS Part 1: Introduction, Product Scope, User Classes, Constraints | 5h | Sections 1–3 drafted |
| Figma account + design system setup (color tokens, typography, spacing) | 2h | Design system page created with brand tokens |
| Go language fundamentals study | 2h | Familiarity with types, structs, error handling, packages |

---

### Sprint 1 — Week 2 (Mar 20–26): Auth & User Management
**Goal:** All 4 roles can register/login and access role-gated routes.

> ⚠️ **Decisions Required (before coding)**
> - Admin account: **pre-seeded in schema.sql seed data; requires password change on first login** (resolved)

**Person A — Go Backend (12h)**
| Task | Done When |
|---|---|
| sqlc query: CreateUser + bcrypt password hashing | User created in DB with hashed password |
| `POST /auth/register` (customer) | Returns JWT, user row in DB with token_version=0 |
| `POST /auth/login` | Returns JWT for all roles |
| JWT middleware (validate signature, expiry, token_version check, is_active check) | Stale/deactivated tokens return 401 TOKEN_INVALID |
| RBAC middleware Authorize(roles...) | 403 on wrong role |
| `POST /auth/logout-all` | Increments token_version; current session survives |
| `GET /me`, `PATCH /me` | Returns and updates customer profile |
| `PATCH /me/password` | Increments token_version; current session survives |
| Admin + `STAFF` + `DELIVERY_STAFF` accounts pre-seeded with `must_change_password = true` | Login redirects to password change; all other endpoints return 403 MUST_CHANGE_PASSWORD until changed |

**Person B — Docs (12h)**
| Task | Done When |
|---|---|
| SRS completion: Functional requirements, Data dictionary, Interface requirements | Full SRS document committed |
| Figma: Auth screens (login, register, forgot password placeholder) | 3 screens at hi-fi quality |
| Figma: Customer branch list + product catalog screens | 2 screens complete |
| React + Vite scaffold (React Router v6, Tailwind, Redux Toolkit, TanStack Query) | `npm run dev` starts with empty app |

---

### Sprint 2 — Week 3 (Mar 27–Apr 2): Branches & Product Catalog
**Goal:** Admin manages branches. Staff manages products with option groups. Customers browse.

> ⚠️ **Decisions Required (before coding)**
> - Maximum option groups per product? (suggested: 10)
> - Can staff reorder option groups? (suggested: creation order fixed for v1)
> - Cart item behavior when product toggled unavailable? (suggested: warning on next cart load)

**Person A — Go Backend (12h)**
| Task | Done When |
|---|---|
| Branch CRUD (admin): `GET/POST /branches`, `PATCH/DELETE /branches/:id` | Branch returned in GET response with dispatch config fields |
| Staff branch assignment: `PATCH /admin/staff/:id/assign-branch` | BranchStaff row created |
| Product CRUD (staff, branch-scoped): `GET/POST /products`, `PATCH/DELETE /products/:id` | Product with options in response |
| ProductOptionGroup + ProductOption CRUD | Nested structure with min_select/max_select |
| Toggle product availability: `PATCH /products/:id/availability` | is_available flips |
| Set stock quantity: `PATCH /products/:id/stock` | stock_qty + low_stock_threshold updated |
| Auto-decrement stock on order confirm (transactional) | stock_qty decremented; is_available set false if stock_qty = 0 |
| Low-stock dashboard alert | Badge shown when stock_qty ≤ low_stock_threshold |
| Customer catalog: `GET /branches`, `GET /branches/:id/products` | Only available products returned |

**Person B — Docs/Design (12h)**
| Task | Done When |
|---|---|
| Figma: Product detail with option picker (min_select/max_select enforced, live price total) | Screen complete with all option group states |
| Figma: Cart page (line items, quantities, branch lock message) | Screen complete |
| React learning: components, hooks, React Router v6, data fetching with axios | Fundamentals understood; Hello World page with API call |
| React: Login + register pages (auth forms, JWT stored in localStorage) | Auth flow works end-to-end with Sprint 1 backend |

---

### Sprint 3 — Week 4 (Apr 3–9): Cart
**Goal:** Customers can build and manage a cart locked to one branch.

> ⚠️ **Decisions Required (before coding)**
> - Branch-switch: clear cart silently after confirm, or keep prompt?
> - Max quantity per line item? (suggested: 99)

**Person A — Go Backend (12h)**
| Task | Done When |
|---|---|
| `POST /cart/items` (add item with options, min_select/max_select enforced) | CartItem created; unit_price computed at add time |
| `GET /cart` (recompute current prices, flag unit_price discrepancies) | Returns full cart with staleness flags |
| `PATCH /cart/items/:id` (quantity) | Quantity updated, total recalculated |
| `DELETE /cart/items/:id` | Item removed |
| Branch-lock enforcement | Adding item from different branch returns 409 |
| Cart persistence on re-login | Cart tied to user_id, survives session |

**Person B — Docs/Design (12h)**
| Task | Done When |
|---|---|
| Figma: Checkout page (address, price breakdown, mock pay button) | Screen complete |
| Figma: Order tracking page (status timeline, polling indicator) | Screen complete |
| Figma: Order history list | Screen complete |
| React:Branch list page | Fetches from API, renders branch cards |
| React:Product catalog page (by branch) | Fetches products, shows availability state |

---

### Sprint 4 — Week 5 (Apr 10–16): Checkout & Payment
**Goal:** Customer can place a paid order. Cart → Order → Payment in one pgx transaction.

> ⚠️ **Decisions Required (before coding)**
> - If payment fails, is the order kept as PAYMENT_FAILED for retry, or deleted?
> - Minimum order value? (suggested: none)

**Person A — Go Backend (12h)**
| Task | Est. | Done When |
|---|---|---|
| Checkout page-load: recompute prices, return discrepancies | 2h | Frontend shows price-change popup if stale |
| `POST /orders` service + pgx transaction | 5h | Order + order_items + cart clear + order_payments in one tx |
| MockGateway: `Charge()` returns COMPLETED instantly | 1h | Mock adapter injected via interface |
| `POST /payments/orders/:id` endpoint | 2h | order_payments.status → COMPLETED; order → PENDING_CONFIRMATION |
| `GET /orders`, `GET /orders/:id` (customer) | 2h | Returns order with status + items snapshot |

**Person B — Docs/Design (12h)**
| Task | Done When |
|---|---|
| Figma: Staff order queue + order detail | 2 screens complete |
| Figma: Staff product manager + admin branch manager | 2 screens complete. **Figma DONE.** |
| Test plan draft: scope, test types, critical paths identified | Document structure created with 50% content |
| React:Product detail + option picker (enforces min_select/max_select, live price) | Option picker functional with backend |
| React:Cart page | Full cart CRUD with branch-lock UX |

---

### Sprint 5 — Week 6 (Apr 17–23): Staff Order Management + Dispatch Jobs
**Goal:** Staff manage preparation, delivery staff manage batch dispatch runs, and background jobs run reliably.

> ⚠️ **Decisions Required (before coding)**
> - Staff rejection reason: free text or predefined list?
> - Auto-cancel double-cancel idempotency: `cancelled_at IS NULL` as guard? (recommended: yes)

**Person A — Go Backend (12h)**
| Task | Est. | Done When |
|---|---|---|
| `GET /staff/orders` (branch-scoped, paginated) | 2h | Returns only this branch's orders |
| `PATCH /orders/:id/confirm` | 1.5h | Status → CONFIRMED |
| `PATCH /orders/:id/status` (staff: `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP`; delivery staff: `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY` → `DELIVERED`) | 2h | Invalid transitions return 422; RBAC enforces role-specific transitions |
| `PATCH /orders/:id/reject` | 1h | Status → CANCELLED, rejection_reason stored |
| Auto-cancel job (robfig/cron, every 60s) | 4h | Sets status=CANCELLED, cancelled_at atomically. Fires ORDER_CONFIRM_REMINDER at 10min mark. Logs every action. |
| Dispatch cron job (robfig/cron, every 5 min) | 2h | For each branch, if `READY_FOR_PICKUP` count ≥ threshold OR oldest ready order age ≥ timeout, emit `DISPATCH_READY` to that branch's delivery staff |
| Order status timeline on `GET /orders/:id` | 2h | History array with timestamps |

**Person B — Frontend (12h)**
| Task | Done When |
|---|---|
| React:Checkout page (address form, price summary, pay button) | Submits to POST /orders, shows order number |
| React:Order confirmation page | Shows order ID, status, next steps |
| React: Order tracking (TanStack Query polling every 30s, status timeline) | Polls /orders/:id; displays OrderStatusTimeline component |
| React:Order history list | Fetches GET /orders, lists with status badges |

---

### Sprint 6 — Week 7 (Apr 24–30): Notifications + Admin Endpoints
**Goal:** Notifications infrastructure live. Admin can manage branches and staff accounts.

**Person A — Go Backend (12h)**
| Task | Done When |
|---|---|
| `notify(userID, eventCode, payload)` service (bulk-insert support) | Notification rows created in DB |
| `GET /notifications` (paginated, unread count) | Returns notifications for authenticated user |
| `PATCH /notifications/:id/read` | is_read flips |
| Wire notification events: ORDER_CONFIRMED, ORDER_CANCELLED, ORDER_PREPARING, ORDER_READY_FOR_PICKUP, DISPATCH_READY, ORDER_OUT_FOR_DELIVERY, ORDER_DELIVERED | Fired on cron or status transitions as applicable |
| Admin: `GET /admin/staff`, `POST /admin/staff` (create `STAFF` or `DELIVERY_STAFF`) | Accounts created with branch assignment |
| Admin: `PATCH /admin/staff/:id/deactivate` | is_active=false; next request from that user returns 401 |
| Delivery staff dispatch queue: `GET /delivery/orders/ready` | Returns all current `READY_FOR_PICKUP` orders for the delivery staff's branch |
| Delivery staff: extend `PATCH /orders/:id/status` for `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY` → `DELIVERED` | Delivery staff can advance these states |

**Person B — Frontend (12h)**
| Task | Done When |
|---|---|
| React:Staff order queue (GET /staff/orders, confirm/reject/advance-to-ready actions) | Full staff workflow functional |
| React:Delivery staff dispatch queue (batch-ready list + per-order advance actions) | Delivery staff can act on all pending ready orders after notification |
| React:Notification bell + dropdown (unread count badge, mark read) | Polls GET /notifications every 60s |
| React:Admin branch manager (list, create, edit, deactivate) | Full branch CRUD |

---

### Sprint 7 — Week 8 (May 1–7): Frontend Completion + API Polish
**Goal:** All v1 screens built. Backend hardened.

**Person A — Go Backend (12h)**
| Task | Done When |
|---|---|
| Rate limiting applied to all routes per §11 Security Controls | All rate-limited routes return 429 when exceeded |
| Error response audit: all endpoints return `{"error":{"code":"...","message":"..."}}` | Consistent error shape across all handlers |
| `GET /health` verified in Docker health check | Docker reports healthy |
| Seed data: 3 branches, 20+ products with option groups, test accounts for all 4 roles | `make seed` populates demo state |
| Fix any bugs found during frontend integration | No known blockers for demo |

**Person B — Frontend (12h)**
| Task | Done When |
|---|---|
| React:Admin staff manager (list, create, deactivate, branch assignment, role selection for `STAFF`/`DELIVERY_STAFF`) | Branch personnel management functional |
| React:Split staff dashboard and delivery dashboard actions by role | Preparation and delivery workflows are both functional in the UI |
| React:Staff product manager (CRUD, toggle availability) | Product management functional |
| Test plan finalized: test cases for all critical paths (auth, cart, checkout, order FSM) | TEST-PLAN.md complete |

---

### Sprint 8 — Week 9 (May 8–14): Testing + Demo Prep
**Goal:** System integration-tested. Demo-ready. All deliverables finalized.

**Person A (12h)**
| Task | Done When |
|---|---|
| End-to-end flow test: branch select → order → batch dispatch → delivered (all statuses transition correctly) | Test passes with real DB |
| Integration test: auto-cancel fires at 15min mark | Cron job confirmed via log |
| Integration test: dispatch cron fires on threshold and timeout conditions | `DISPATCH_READY` notifications emitted correctly in both cases |
| Integration test: JWT revocation (logout-all, password change, deactivation) | All three revocation paths return 401 |
| Demo walkthrough scripted for each role | 5-minute per-role demo script written |
| `PaymentGateway` Phase 2 swap instructions written | `docs/PAYMENT-GATEWAY.md` stub |

**Person B (12h)**
| Task | Done When |
|---|---|
| Test report: execute test plan, record results, document pass/fail | TEST-REPORT.md complete |
| SRS final review and formatting | SRS polished and submitted |
| Demo rehearsal + slide deck if required | Both team members can demo all 4 roles |
| Buffer: fix any remaining frontend/backend integration bugs | No blocking issues |

---

After sprint 8, there is approximately 1.5 weeks of buffer before the 2.5-month deadline (May 28). This buffer absorbs sprint overruns, which are expected given the learning curve.

---

## 8. Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R01 | Custom order scope creep (deposit logic, scheduling) | High | High | Strict pizza-model: structured options only, no free-form. Deposit is a fixed % computed by the system, not negotiated. |
| R02 | Payment integration overrun (VNPay/Momo sandbox issues) | High | Medium | Use mock gateway in Phase 1. `PaymentGateway` interface isolates swap to one adapter file. |
| R03 | Custom order + standard order pipelines diverge | Medium | Medium | Both share the same canonical fulfillment FSM from `CONFIRMED` onward: branch staff prepare to `READY_FOR_PICKUP`, then delivery staff execute the batch dispatch and delivery stages. |
| R04 | Cart branch-lock confusion UX | Medium | Low | Clear 409 response + frontend prompt: "Clear cart and shop from [new branch]?" |
| R05 | 15-min auto-cancel cron reliability | Medium | Low | Use pg_cron or a background job. Log all auto-cancels. Grace period: notify staff at 10 min. |
| R06 | Monolith performance under concurrent orders | Medium | Low | Acceptable for assessment scale. DB indexes on `orders.branch_id`, `orders.status`, `orders.created_at`. |
| R07 | Staff skip or misorder manual status transitions | Medium | Medium | Enforce the canonical FSM in the orders service; invalid transitions return 422 and all transitions are logged. |
| R08 | Dispatch cron misses or duplicates a batch-ready notification | Medium | Low | Run cron every 5 minutes, compute branch-level readiness from current order state, and make notification emission idempotent per branch/time window. |
| R09 | Snapshot consistency (price changes after order placed) | Medium | Low | `order_items.selected_options_snapshot` and `unit_price` are immutable after checkout. |
| R10 | Scope overrun from admin analytics | Low | Medium | Analytics API in Sprint 7, UI in Sprint 8. Cut CSV export (Tier 3) if behind. |
| R11 | Two-person team bus factor | High | Low | All architectural decisions documented here. API-CONVENTION.md is source of truth. |
| R12 | Go learning curve | High | High | Sprint 0 includes dedicated learning time; estimates are 2–3× slower than an experienced Go developer. |
| R13 | Frontend-backend integration lag | Medium | Medium | Person B builds frontend against real API; any contract mismatch surfaces in Sprint 5–6 integration window. |
| R14 | No AI code completion | Medium | Known constraint | Mitigation: extensive official docs (go.dev, react.dev), pair programming sessions. |

---

## 9. Out of Scope (Tier 3 — Post-Assessment)

- Live GPS delivery tracking / map view
- Full deposit scheduling calendar for custom orders
- CSV export from admin analytics
- Push notifications (mobile)
- Multi-currency support
- Branch revenue sharing / commission model
- Real-time order updates via WebSocket (polling is acceptable for v1)

---

## 10. API Convention Reference

> Defined in `API-CONVENTION.md` (Sprint 0 deliverable). Key decisions pre-agreed here:

- **Base URL:** `/api/v1/`
- **Auth:** `Authorization: Bearer <jwt>` on all protected routes
- **Error shape:** `{ "error": { "code": "ORDER_INVALID_STATUS", "message": "..." } }`
- **Pagination:** `?page=1&limit=20` → `{ data: [...], meta: { total, page, limit } }`
- **Timestamps:** ISO 8601 UTC
- **IDs:** UUID v4

---

## 11. Tech Stack

> **Status: DECIDED** — Stack confirmed before Sprint 0.

| Layer | Choice | Notes |
|---|---|---|
| Backend language | Go 1.22+ | Compiled, fast, explicit error handling |
| Backend framework | Gin | Well-documented Go router; large beginner community |
| Database | PostgreSQL | Confirmed |
| DB queries | sqlc + pgx v5 | Generates type-safe Go from SQL; teaches real SQL |
| Schema management | `sql/schema.sql` | Run once on fresh DB: `psql $DATABASE_URL < sql/schema.sql` |
| Validation | go-playground/validator | Struct tag validation for request bodies |
| Background jobs | robfig/cron | Cron expression scheduler for auto-cancel and batch dispatch jobs |
| Auth | `golang-jwt/jwt` + bcrypt | JWT sign/verify; bcrypt for password hashing |
| Frontend | React 18 + Vite 5 | SPA with React Router v6 |
| Frontend language | TypeScript | Type-safe frontend |
| Styling | Tailwind CSS | Confirmed |
| State management | Redux Toolkit | Global client state (auth, cart, UI) |
| Data fetching | TanStack Query | Server state, caching, polling |
| Dev infra | Docker Compose | Confirmed |
| CI | GitHub Actions | Confirmed |
| Payment (v1) | Mock adapter (behind `PaymentGateway` interface) | Confirmed |
| Payment (v2) | VNPay or Momo | TBD Phase 2 |
| Image Storage | Cloudflare R2 | Deferred — Sprint 0 uses placeholder URLs |

---

*Document owner: Bakerio dev team. Update this file as scope decisions change.*
