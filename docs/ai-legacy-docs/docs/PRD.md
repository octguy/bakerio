# Bakerio — Product Requirements Document (PRD)

> Version 1.0 | 2026-03-03
> Status: Approved for development

---

## 1. Purpose

This document defines what Bakerio must do, for whom, and under what constraints. It is the single source of truth for feature scope. Any feature not listed here requires a change request before implementation begins.

---

## 2. Product Vision

Bakerio lets customers order freshly baked goods from their nearest branch — including fully personalized custom cakes — with the same ease as ordering a pizza. Branch staff manage inventory and fulfill orders. Delivery staff handle last-mile logistics. Admins run the whole operation from one dashboard.

**One-liner:** *Domino's, but for your local bakery chain.*

---

## 3. Users & Goals

| User | Primary Goal | Success Metric | Measurement Method |
|---|---|---|---|
| Customer | Order a product with minimum friction | p95 time from branch selection to order confirmation < 4 minutes | Measure via frontend timing events logged to console (v1); APM tool (v2) |
| Branch Staff | Know exactly what to make and in what order | 0 orders confirmed without all required fields visible | Verified by staff UAT on staging before launch |
| Delivery Staff | Know where to go, deliver, confirm | Delivery status updated within 2 minutes of each physical transition | Spot-checked during demo with real device |
| Admin | Full system visibility without engineering help | All reports load within 2s; no hardcoded data | Verified by Lighthouse + manual review |

## 3a. Priority Glossary

| Priority | Meaning | Ship without it? |
|---|---|---|
| **P0** | Must-have. App is broken or unusable without it. | No |
| **P1** | Should-have. Significant UX degradation without it. | Yes, but fix in next sprint |
| **P2** | Nice-to-have. Adds value but not critical path. | Yes |
| **P3** | Future / post-project. Do not implement in v1. | Out of scope |

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Customers can self-register with email + password | P0 |
| AUTH-02 | All users log in via email + password, receive a JWT | P0 |
| AUTH-03 | JWT expires in 7 days; refresh token flow optional (v2) | P0 |
| AUTH-04 | Staff and Delivery Staff accounts created by Admin only | P0 |
| AUTH-05 | Role-based access: each role sees only its permitted endpoints | P0 |
| AUTH-06 | Passwords hashed with bcrypt (min cost factor 12) | P0 |
| AUTH-07 | Customer can update their profile (name, phone, default address) | P1 |
| AUTH-08 | Deactivating a staff account immediately invalidates their session via is_active check — they cannot hit protected endpoints after deactivation, even with a valid JWT | P0 |
| AUTH-09 | Password validation: minimum 8 characters, at least 1 uppercase, 1 number | P0 |
| AUTH-10 | Users can trigger "logout all other sessions" (increments token_version; current session survives). Password change also increments token_version. Stale tokens return 401 TOKEN_INVALID. | P1 |

### 4.2 Branch Management

| ID | Requirement | Priority |
|---|---|---|
| BRANCH-01 | Admin can create a branch with name, address, lat/lng, phone, hours | P0 |
| BRANCH-02 | Admin can edit or soft-delete (deactivate) a branch | P0 |
| BRANCH-03 | Customers see only active branches | P0 |
| BRANCH-04 | Each branch has independent product catalog and staff | P0 |

### 4.3 Product Catalog

| ID | Requirement | Priority |
|---|---|---|
| PROD-01 | Staff can create products: name, description, images, base price, category | P0 |
| PROD-02 | Products belong to exactly one branch | P0 |
| PROD-03 | Categories: CAKE, COOKIE, PASTRY, CUSTOM | P0 |
| PROD-04 | Staff can toggle product availability (on/off) without deleting | P0 |
| PROD-05 | Products can have multiple option groups (see §4.4) | P0 |
| PROD-06 | Customers browse catalog filtered by branch, with unavailable items greyed | P0 |
| PROD-07 | Product listing shows: name, image, base price, average rating | P1 |

### 4.4 Product Options (Structured Customization)

This powers both standard product variants and the cake decoration builder.

| ID | Requirement | Priority |
|---|---|---|
| OPT-01 | An option group has: name, min_select (int, default 0), max_select (int, nullable = unlimited), sort_order. Required when min_select ≥ 1. Multi-select when max_select IS NULL or > 1. `is_required` and `is_multi_select` booleans are both removed. | P0 |
| OPT-02 | An option has: name, image (optional), price delta, availability, sort order | P0 |
| OPT-03 | Groups with min_select ≥ 1 must meet the minimum selection count before add-to-cart. Groups with max_select set must not exceed it. | P0 |
| OPT-04 | Multi-select groups allow zero or more selections | P0 |
| OPT-05 | Price updates live as options are toggled | P0 |
| OPT-06 | Staff can add/edit/remove option groups and options per product | P0 |

**Decoration Option Groups for CUSTOM cakes (pre-seeded per branch setup):**

| Group Name | Type | Example Options |
|---|---|---|
| Size | Required, single | 15cm / 20cm / 25cm / 30cm |
| Base Flavor | Required, single | Vanilla / Chocolate / Red Velvet / Matcha / Lemon |
| Frosting | Required, single | Buttercream / Whipped Cream / Fondant / Cream Cheese |
| Color Palette | Required, single | Pastel Pink / Classic White / Dark Chocolate / Earthy Tones / Rainbow |
| Decoration Theme | Required, single | Birthday / Wedding / Anniversary / Graduation / Christmas / Minimalist |
| Add-on Decorations | Optional, multi | Edible Roses / Gold Leaf / Sprinkles / Fruit Slices / Macarons / Fondant Figures / Candles |
| Candle Style | Optional, single | None / Classic White / Colored / Sparkler / Numbered |
| Writing Style | Optional, single | None / Classic Script / Bold Block / Elegant Cursive |
| Inscription | Text input, max 30 chars | Free text (the only non-option-group field on a custom order) |

> **UX principle:** Each option shows a thumbnail image and price delta. The customer sees a running total as they pick. Mobile-first layout with large tap targets.

### 4.5 Cart

| ID | Requirement | Priority |
|---|---|---|
| CART-01 | Cart persists server-side, linked to user account | P0 |
| CART-02 | Cart is locked to one branch at a time | P0 |
| CART-03 | Adding a product from a different branch triggers a "clear cart?" confirmation | P0 |
| CART-04 | Customer can change quantity or remove any line item | P0 |
| CART-05 | Cart shows: each item with selected options, quantity, line total, cart total | P0 |
| CART-06 | Adding to cart requires all required option groups to be completed | P0 |
| CART-07 | Out-of-stock options cannot be selected | P1 |

### 4.6 Checkout & Payment

| ID | Requirement | Priority |
|---|---|---|
| PAY-01 | Checkout summary shows: items, subtotal, discount, delivery fee (flat, 20,000₫ fixed), total | P0 |
| PAY-02 | Customer confirms delivery address (editable at checkout) | P0 |
| PAY-03 | Phase 1: Mock payment — "Pay Now" sets payment to COMPLETED instantly | P0 |
| PAY-04 | Phase 2: Real gateway (VNPay or Momo) via swappable adapter | P2 |
| PAY-05 | Failed payment does not create an order | P0 |
| PAY-06 | Successful payment creates order with status PENDING_CONFIRMATION | P0 |
| PAY-07 | Customer receives an order confirmation number immediately | P0 |

### 4.7 Order Lifecycle — Standard

| ID | Requirement | Priority |
|---|---|---|
| ORD-01 | Order status FSM: PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY_FOR_PICKUP → ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED | P0 |
| ORD-02 | Terminal states: DELIVERED, CANCELLED | P0 |
| ORD-03 | Staff must confirm within 15 minutes or order auto-cancels | P0 |
| ORD-04 | Staff sets estimated ready time on confirmation | P1 |
| ORD-05 | Staff can reject with mandatory reason; customer notified | P0 |
| ORD-06 | Price and item options are snapshotted at checkout — immutable after | P0 |
| ORD-07 | Customer can view full order status timeline | P0 |
| ORD-08 | Customer notified on each status change (in-app, v1) | P1 |

### 4.8 Custom Order Flow (Pizza-Model)

> **Status: Backlog (v2).** Fully designed; deferred due to Go learning curve and timeline constraints. All CUST-* requirements are P3 for v1.

| ID | Requirement | Priority |
|---|---|---|
| CUST-01 | Customer selects a CUSTOM product and builds it via structured option groups (see §4.4) | P3 |
| CUST-02 | Customer sets desired delivery date (minimum 48h from submission) | P3 |
| CUST-03 | Customer sees full configuration summary before confirming | P3 |
| CUST-04 | Custom order submitted → status PENDING_REVIEW | P3 |
| CUST-05 | Staff reviews structured config, can confirm or reject with reason | P3 |
| CUST-06 | On staff confirmation: deposit amount (30% of total) calculated and shown to customer | P3 |
| CUST-07 | Customer pays deposit; status → DEPOSIT_PAID → IN_PRODUCTION | P3 |
| CUST-08 | Custom order follows same delivery pipeline as standard from READY_FOR_PICKUP onward | P3 |
| CUST-09 | Remaining balance (70% after deposit) is a business operations concern — not tracked in the system. No payment record, no UI, no API. | P3 |
| CUST-10 | Staff must review a custom order within 4 hours of submission. After 4h: escalation notification. After 8h: auto-reject with reason "No response from branch" | P3 |
| CUST-11 | Customer or staff may cancel a custom order in `DEPOSIT_PAID` state within 24h of `deposit_paid_at`. Full refund (`CANCELLED_AFTER_DEPOSIT`). After 24h: admin-only force-cancel, no auto-refund. | P3 |

### 4.9 Delivery

> **Status: Backlog (v2) — full delivery pool.** v1 simplification: delivery staff directly advance order status (READY_FOR_PICKUP → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED) with no assignment pool or race-condition logic. The ASSIGNED state is removed from the v1 FSM. DEL-03, DEL-04, DEL-07 are deferred.

| ID | Requirement | Priority |
|---|---|---|
| DEL-01 | When order reaches READY_FOR_PICKUP, delivery staff can see it | P0 |
| DEL-02 | Delivery staff see available orders with branch address + customer address | P0 |
| DEL-03 | Delivery staff accept an assignment; order status → ASSIGNED | P3 |
| DEL-04 | Declined assignments return the order to the pool | P3 |
| DEL-05 | Delivery staff advance status: PICKED_UP → OUT_FOR_DELIVERY → DELIVERED | P0 |
| DEL-06 | Each status change is timestamped | P0 |
| DEL-07 | Optimistic lock prevents two staff claiming the same order simultaneously | P3 |

### 4.10 Vouchers & Promotions

> **Status: Backlog (v2).** Fully designed; deferred due to Go learning curve and timeline constraints. All VOUCH-* requirements are P3 for v1.

| ID | Requirement | Priority |
|---|---|---|
| VOUCH-01 | Admin creates vouchers: code, discount type (fixed/%), value, min order, expiry, usage limit | P3 |
| VOUCH-02 | Vouchers can be scoped to one branch or system-wide | P3 |
| VOUCH-03 | One voucher per order or per custom order deposit | P3 |
| VOUCH-04 | Validation checks: not expired, not over limit, not used by this customer, min order met | P3 |
| VOUCH-05 | Error messages are specific (EXPIRED / LIMIT_REACHED / ALREADY_USED / MIN_ORDER_NOT_MET) | P3 |
| VOUCH-06 | Admin can deactivate a voucher before expiry | P3 |
| VOUCH-07 | Admin dashboard shows usage count per voucher | P3 |

### 4.11 Reviews

> **Status: Backlog (v2).** Fully designed; deferred due to Go learning curve and timeline constraints. All REV-* requirements are P3 for v1.

| ID | Requirement | Priority |
|---|---|---|
| REV-01 | Customer can review after order reaches DELIVERED | P3 |
| REV-02 | Review: 1–5 star rating + optional text comment | P3 |
| REV-03 | One review per order per product | P3 |
| REV-04 | Reviews visible on product listing page | P3 |
| REV-05 | Average rating computed and shown on product card | P3 |
| REV-06 | Admin can remove inappropriate reviews | P3 |

### 4.12 Admin Dashboard

| ID | Requirement | Priority |
|---|---|---|
| ADMIN-01 | Full branch CRUD | P0 |
| ADMIN-02 | Staff account creation and deactivation, branch assignment | P0 |
| ADMIN-03 | Voucher CRUD | P3 |
| ADMIN-04 | Reports: total orders, revenue, orders per branch, top products | P3 |
| ADMIN-05 | Date range filter on reports (7d / 30d / custom) | P3 |
| ADMIN-06 | CSV export | P3 |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | All passwords bcrypt-hashed. No plaintext secrets in codebase (.env only). |
| NFR-02 | Security | JWT validated on every protected request. Role checked per route. |
| NFR-03 | Security | SQL injection prevented via ORM parameterized queries. |
| NFR-04 | Security | Input validated and sanitized at API boundary. |
| NFR-05 | Performance | Product listing API responds in < 500ms under normal load. |
| NFR-06 | Performance | Checkout flow (cart → payment → order creation) completes in < 2s. |
| NFR-07 | Reliability | Auto-cancel cron: confirmed by log entry. No silent failures. If cron job fails, log at `error` level and retry once after 5 minutes. If second attempt fails, log at `fatal` level. |
| NFR-08 | Data Integrity | Order item prices and options are immutable snapshots after checkout. |
| NFR-09 | Availability | For school project context: dev server uptime is acceptable. |
| NFR-10 | Usability | Mobile-first responsive design. Minimum touch target 44×44px. |
| NFR-11 | Usability | Option picker loads with images; skeleton loading state on slow connections. |
| NFR-12 | Maintainability | Payment gateway isolated behind an interface for easy swap. |
| NFR-13 | Testability | Each service layer independently testable (no direct DB calls in controllers). |

---

## 6. Constraints

| Constraint | Detail |
|---|---|
| Team | 2 developers |
| Time budget | 3h/day × 4 days/week × 2 people = 24 person-hours/week |
| Duration | 15 weeks (3.5 months) |
| Total capacity | ~360 person-hours |
| Architecture | Monolith-first; microservice extraction is post-project |
| Deployment | Local / Docker for development; single VPS or Vercel/Render for demo |
| Language | Team's choice (Node.js + React proposed) |

---

## 7. Open Technical Decisions (must resolve before Sprint 1)

> Auth session revocation is **resolved**: option (c) `token_version` on user row. Confirmed.

| Decision | Options | Deadline |
|---|---|---|
| Go HTTP framework | **Gin** ✓ resolved | — |
| DB query layer | **sqlc + pgx v5** ✓ resolved | — |
| Background job scheduler | **robfig/cron v3** ✓ resolved | — |
| Frontend state management | **Redux Toolkit** ✓ resolved | — |
| Delivery fee | **Fixed 20,000₫ env var** ✓ resolved | — |
| Admin account creation | **Pre-seeded; must_change_password = true on first login** ✓ resolved | — |

---

## 8. Assumptions

- Delivery is handled by platform-employed staff (not outsourced)
- Custom orders follow structured pizza-model only — no free-form design uploads in v1
- Payment is mocked in Phase 1; real gateway (VNPay/Momo) in Phase 2 (Sprint 13+)
- A single flat delivery fee per order (no distance-based pricing in v1)
- "Real-time" updates are implemented via polling (WebSocket is out of scope)
- Branch coordinates are used for display only (no routing algorithms in v1)

---

## 9. Out of Scope

The following are explicitly excluded from v1:

- Live GPS tracking / route optimization
- Mobile native app (iOS/Android)
- WebSocket real-time updates
- Remaining balance collection on delivery (tracked manually)
- Multi-currency
- Customer loyalty points
- Branch revenue sharing / commission model
- Design canvas preview for custom cakes (image generation)
- Outsourced delivery integration (Grab, Shopee Food)

---

## 10. Change Request Process

Any scope change after this document is approved requires:
1. Written description of the change
2. Impact assessment (hours estimate, affected sprints)
3. Team agreement before implementation

Changes that shift a feature from P1→P0 or add new features to a current sprint must be approved by both team members.

---

*Approved by: Bakerio dev team | 2026-03-03*
