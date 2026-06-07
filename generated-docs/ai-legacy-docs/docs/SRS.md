# Bakerio — Software Requirements Specification (SRS)

> Version 1.0 | 2026-03-09
> Status: Draft
> References: [PRD.md](PRD.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [API-SPEC.md](API-SPEC.md)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for Bakerio, a multi-branch sweet goods ordering platform. It serves as the contractual agreement between stakeholders and the development team on what the system must do.

### 1.2 Scope

Bakerio covers the full order lifecycle: catalog browsing, cart management, checkout & payment, order fulfillment by branch staff, last-mile delivery, and post-delivery reviews. Custom cake orders with structured configuration options are included in scope.

### 1.3 Definitions

| Term | Definition |
|---|---|
| Branch | A physical bakery location with its own catalog, staff, and order queue |
| Custom Order | A cake order built from structured option selections (size, flavor, frosting, decorations, etc.) |
| Standard Order | An order for any pre-configured catalog product |
| FSM | Finite State Machine — canonical order status transitions |
| JWT | JSON Web Token — used for stateless authentication |
| RBAC | Role-Based Access Control |
| Snapshot | Immutable copy of product/price data captured at order time |

### 1.4 Document Conventions

- **P0** — Must-have. App is broken without it.
- **P1** — Should-have. Significant UX degradation without it.
- **P2** — Nice-to-have. Not critical path.
- Requirements reference PRD IDs (e.g. `AUTH-01`) where applicable.

---

## 2. System Overview

Bakerio is a monolith-first web application with a REST API backend and a React frontend. It supports four user roles across two surfaces: a customer-facing storefront and role-specific dashboards for staff, delivery staff, and admins.

```
Customer → Storefront (browse, cart, checkout, track)
Staff    → Branch Dashboard (catalog, order queue)
Delivery → Delivery Dashboard (pickup pool, status updates)
Admin    → Admin Panel (branches, accounts, vouchers, reports)
```

---

## 3. User Roles & Responsibilities

| Role | Description | Account Creation |
|---|---|---|
| **Customer** | Places and tracks orders, writes reviews | Self-registration |
| **Staff (Baker)** | Manages branch catalog, confirms and fulfills orders | Admin only |
| **Delivery Staff** | Picks up and delivers orders, updates delivery status | Admin only |
| **Admin** | Manages branches, staff accounts, vouchers, views reports | Pre-seeded / Admin only |

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Customer self-registration with email + password | P0 |
| AUTH-02 | Login for all roles returns a JWT | P0 |
| AUTH-03 | JWT expires in 7 days | P0 |
| AUTH-04 | Staff and Delivery Staff accounts created by Admin only | P0 |
| AUTH-05 | Role-based access: each role restricted to permitted endpoints only | P0 |
| AUTH-06 | Passwords hashed with bcrypt (min cost factor 12) | P0 |
| AUTH-07 | Password policy: min 8 chars, 1 uppercase, 1 number | P0 |
| AUTH-08 | Deactivating an account immediately invalidates active sessions | P0 |
| AUTH-09 | Customer can update profile (name, phone, default address) | P1 |

### 4.2 Branch Management

| ID | Requirement | Priority |
|---|---|---|
| BRANCH-01 | Admin creates a branch with name, address, lat/lng, phone, operating hours | P0 |
| BRANCH-02 | Admin can edit or deactivate a branch | P0 |
| BRANCH-03 | Customers see only active branches | P0 |
| BRANCH-04 | Each branch has an independent product catalog and staff pool | P0 |

### 4.3 Product Catalog

| ID | Requirement | Priority |
|---|---|---|
| PROD-01 | Staff creates products: name, description, images, base price, category | P0 |
| PROD-02 | Each product belongs to exactly one branch | P0 |
| PROD-03 | Categories: `CAKE`, `COOKIE`, `PASTRY`, `CUSTOM` | P0 |
| PROD-04 | Staff toggles product availability without deletion | P0 |
| PROD-05 | Products support multiple option groups (see §4.4) | P0 |
| PROD-06 | Customer catalog shows available items; unavailable items are greyed out | P0 |
| PROD-07 | Product listing shows name, image, base price, average rating | P1 |

### 4.4 Product Options (Structured Customization)

Each option group has a name, required flag, multi-select flag, and ordered list of options. Each option has a name, price delta, image, and availability flag.

**Standard option groups** (examples): Size (S/M/L), Flavor (Chocolate/Vanilla/Strawberry).

**Custom cake option groups** (required for `CUSTOM` category):

| Group | Type | Options (examples) |
|---|---|---|
| Size | Single-select, required | 4-inch / 6-inch / 8-inch / 10-inch |
| Base Flavor | Single-select, required | Vanilla / Chocolate / Red Velvet / Matcha |
| Frosting | Single-select, required | Buttercream / Whipped Cream / Fondant / Ganache |
| Color Palette | Single-select, required | Pastel / Bold / Monochrome / Natural |
| Decoration Theme | Single-select, required | Floral / Minimalist / Fantasy / Geometric |
| Add-on Decorations | Multi-select, optional | Roses / Gold Leaf / Sprinkles / Fruit / Macarons / Fondant Figures / Candles |
| Candle Style | Single-select, optional | Classic / Number / Sparkler |
| Writing Style | Single-select, optional | Piped / Printed / None |
| Inscription | Text input (max 30 chars), optional | Free text |

### 4.5 Cart

| ID | Requirement | Priority |
|---|---|---|
| CART-01 | Customer adds a product with selected options to cart | P0 |
| CART-02 | Cart is locked to a single branch per session | P0 |
| CART-03 | Adding an item from a different branch returns a 409 with a clear prompt | P0 |
| CART-04 | Customer updates quantity or removes items | P0 |
| CART-05 | Cart persists across sessions (server-side, linked to account) | P0 |
| CART-06 | Unit price computed and locked at add-to-cart time | P0 |

### 4.6 Checkout & Payment

| ID | Requirement | Priority |
|---|---|---|
| PAY-01 | Checkout displays order summary, delivery address, subtotal, discount, final total | P0 |
| PAY-02 | Customer confirms or edits delivery address (pre-filled from profile) | P0 |
| PAY-03 | Phase 1: mock payment gateway (instant COMPLETED) | P0 |
| PAY-04 | Phase 2: VNPay / Momo gateway (swapped via `PaymentGateway` interface) | P2 |
| PAY-05 | Successful payment creates an Order with status `PENDING_CONFIRMATION` | P0 |
| PAY-06 | Customer receives order confirmation with order ID | P0 |
| PAY-07 | Voucher validation is atomic within the checkout transaction | P0 |

### 4.7 Vouchers & Promotions

| ID | Requirement | Priority |
|---|---|---|
| VOUCH-01 | Admin creates vouchers: code, discount type (fixed/%), value, min order, expiry, usage limit | P0 |
| VOUCH-02 | Vouchers are scoped to a branch or system-wide | P0 |
| VOUCH-03 | Admin deactivates a voucher before expiry | P0 |
| VOUCH-04 | Customer applies one voucher code per order at checkout | P0 |
| VOUCH-05 | System validates: code exists, not expired, not used by this customer, min order met | P0 |
| VOUCH-06 | Invalid codes return a specific error (expired / already used / min not met) | P0 |

### 4.8 Order Fulfillment (Staff)

| ID | Requirement | Priority |
|---|---|---|
| ORD-S01 | Staff views branch order queue sorted by creation time | P0 |
| ORD-S02 | New orders highlighted; staff must confirm within 15 minutes or order auto-cancels | P0 |
| ORD-S03 | Staff confirms an order → status `CONFIRMED`; can set estimated ready time | P0 |
| ORD-S04 | Staff rejects an order with a required reason; customer is notified | P0 |
| ORD-S05 | Staff advances order: `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` | P0 |
| ORD-S06 | Each status transition is logged with timestamp and staff ID | P0 |

### 4.9 Delivery

| ID | Requirement | Priority |
|---|---|---|
| DEL-01 | Delivery dashboard shows orders with status `READY_FOR_PICKUP` assigned to the logged-in staff | P0 |
| DEL-02 | Delivery staff accepts or declines an assignment | P0 |
| DEL-03 | Declined orders return to the unassigned pool | P0 |
| DEL-04 | Delivery staff advances status: `ASSIGNED` → `PICKED_UP` → `OUT_FOR_DELIVERY` → `DELIVERED` | P0 |
| DEL-05 | Each transition is timestamped | P0 |
| DEL-06 | Concurrent claim race condition resolved by optimistic lock (first writer wins, second gets 409) | P0 |

### 4.10 Custom Orders

| ID | Requirement | Priority |
|---|---|---|
| CUST-01 | Customer builds a custom cake from structured option groups (see §4.4) | P0 |
| CUST-02 | Customer sets desired delivery date (minimum 48h from submission) | P0 |
| CUST-03 | Custom order submitted with status `PENDING_REVIEW` | P0 |
| CUST-04 | Staff reviews full configuration and confirms or rejects with a reason | P0 |
| CUST-05 | On staff confirm: deposit amount is set, customer pays deposit → `DEPOSIT_PAID` → `IN_PRODUCTION` | P0 |
| CUST-06 | From `READY_FOR_PICKUP` onward, custom orders follow the same delivery pipeline as standard orders | P0 |

### 4.11 Order Tracking & History

| ID | Requirement | Priority |
|---|---|---|
| TRACK-01 | Customer views status timeline: Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered | P0 |
| TRACK-02 | Status updates via polling (acceptable for v1) | P0 |
| TRACK-03 | Customer sees delivery staff name once assigned | P1 |
| TRACK-04 | Customer notified on each status change (in-app notification) | P0 |
| TRACK-05 | Customer views order history with date, branch, total, status | P0 |
| TRACK-06 | "Reorder" pre-fills cart with same items (availability warning if any item is now unavailable) | P1 |

### 4.12 Reviews

| ID | Requirement | Priority |
|---|---|---|
| REV-01 | Review prompt shown after order reaches `DELIVERED` status | P0 |
| REV-02 | Customer rates 1–5 stars and optionally adds a comment | P0 |
| REV-03 | One review per order per product | P0 |
| REV-04 | Reviews visible publicly on product and branch pages | P0 |
| REV-05 | Duplicate review attempt returns 409 | P0 |

### 4.13 Admin Analytics

| ID | Requirement | Priority |
|---|---|---|
| ADMIN-01 | Admin views: total orders, total revenue, orders by branch, top products by volume | P0 |
| ADMIN-02 | Date range filter: last 7d / 30d / custom | P0 |
| ADMIN-03 | Per-branch drill-down | P1 |
| ADMIN-04 | CSV export | P2 |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | p95 time from branch selection to order confirmation < 4 minutes (customer-side) |
| NFR-02 | Performance | Admin reports load within 2 seconds |
| NFR-03 | Security | Passwords hashed with bcrypt, cost factor ≥ 12 |
| NFR-04 | Security | JWT-based auth; deactivated accounts blocked immediately |
| NFR-05 | Security | All inputs validated server-side; no raw errors exposed to clients |
| NFR-06 | Reliability | Auto-cancel job runs every 60s; retries once on failure; logs all cancellations |
| NFR-07 | Data Integrity | Order items and prices are immutable snapshots after checkout |
| NFR-08 | Concurrency | Delivery assignment race condition resolved via optimistic lock |
| NFR-09 | Concurrency | Voucher redemption is atomic; concurrent use tested |
| NFR-10 | Scalability | System designed for assessment scale; DB indexes on `orders.branch_id`, `orders.status`, `orders.created_at` |
| NFR-11 | Maintainability | `PaymentGateway` interface isolates gateway swap to one adapter file |

---

## 6. Data Requirements

### 6.1 Key Entities

`users`, `branches`, `branch_staff`, `products`, `product_option_groups`, `product_options`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `vouchers`, `voucher_usages`, `custom_orders`, `custom_order_options`, `delivery_assignments`, `reviews`

### 6.2 Critical Data Rules

- `order_items.selected_options_snapshot` and `unit_price` are **immutable** after checkout.
- `orders.delivery_address` is a **snapshot** of the address at order time.
- `custom_order_options.price_delta` is a **snapshot** at selection time.
- Cart is **hard-locked** to one `branch_id`; cross-branch add returns 409.

> Full schema: [ARCHITECTURE.md](ARCHITECTURE.md) | Entity definitions: [business-plan.md](../business-plan.md) §4

---

## 7. Constraints & Assumptions

| # | Constraint |
|---|---|
| C01 | 2-person development team, 24 person-hours/week, 15-week timeline |
| C02 | Monolith-first architecture; no microservices in v1 |
| C03 | Phase 1 payment is a mock adapter only; no real money moves |
| C04 | Custom orders use structured options only — no free-form text except inscription (max 30 chars) |
| C05 | Real-time updates via polling in v1; WebSocket deferred to post-assessment |
| C06 | Delivery is handled by internal platform staff only (no third-party logistics) |
| C07 | Vietnamese market; currency is VND (₫); delivery fee default 20,000 ₫ |

---

## 8. Out of Scope (v1)

- Live GPS delivery tracking / map view
- Full deposit scheduling calendar for custom orders
- Push notifications (mobile)
- Multi-currency support
- Branch revenue sharing / commission model
- WebSocket real-time updates
- CSV export from analytics

---

*Document owner: Bakerio dev team. Changes require a formal change request after Sprint 0.*
