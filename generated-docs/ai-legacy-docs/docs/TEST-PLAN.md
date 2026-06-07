# Bakerio — Test Plan

> Version 1.0 | 2026-03-09
> Status: Draft
> References: [SRS.md](SRS.md) | [API-SPEC.md](API-SPEC.md) | [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. Introduction

### 1.1 Purpose

This document defines the testing strategy, scope, and test cases for the Bakerio platform. It ensures all functional requirements in the SRS are verified before each sprint ships and before the final demo.

### 1.2 Test Objectives

- Verify all P0 and P1 functional requirements are correctly implemented
- Confirm order/delivery FSM transitions are enforced and cannot be bypassed
- Validate critical race conditions (voucher redemption, delivery assignment)
- Ensure security requirements (RBAC, input validation, auth) hold across all roles
- Confirm the system handles edge cases gracefully (auto-cancel, 409s, snapshots)

---

## 2. Scope

### 2.1 In Scope

| Area | Coverage |
|---|---|
| Authentication & RBAC | All roles, JWT lifecycle, deactivation |
| Branch & Product Catalog | CRUD, availability toggle, branch-scoped access |
| Cart | Add/update/remove, branch lock, persistence |
| Checkout & Payment | Order creation, mock payment, atomicity |
| Voucher | Validation rules, race condition, single-use-per-customer |
| Order FSM (Standard) | All transitions, auto-cancel, rejection |
| Order FSM (Custom) | Submission, review, deposit, production pipeline |
| Delivery | Assignment, status transitions, decline + re-pool |
| Reviews | Post-delivery only, duplicate prevention |
| Admin | Branch/staff/voucher management, analytics |
| Notifications | In-app notifications created on key events |

### 2.2 Out of Scope (v1 Testing)

- Real payment gateway (VNPay / Momo) — tested in Phase 2
- WebSocket / real-time updates
- Mobile app testing
- Load / stress testing (beyond basic concurrency cases)
- CSV export

---

## 3. Test Strategy

### 3.1 Test Levels

| Level | Tool | When |
|---|---|---|
| **Unit** | Jest (or Vitest) | Every function/service in isolation; run on every PR |
| **Integration** | Jest + Supertest | API endpoints against a real test DB; run on every PR |
| **E2E** | Playwright | Full user flows on staging; run before sprint review |
| **Manual / UAT** | Checklist (this doc) | Each role tested by a team member before demo |

### 3.2 Test Environment

| Environment | Purpose | DB |
|---|---|---|
| Local (Docker Compose) | Developer testing | Seeded test DB |
| CI (GitHub Actions) | Automated unit + integration | Ephemeral Postgres |
| Staging | E2E + UAT | Full seed data (3 branches, 20+ products, 4 role accounts) |

### 3.3 Entry & Exit Criteria

**Sprint Entry:** Previous sprint's P0 tests all pass. No open P0 bugs.

**Sprint Exit:** All P0 test cases for the sprint pass. P1 failures logged as issues; do not block ship.

**Demo Exit:** All E2E flows pass on staging. All 4 role demo scripts execute without errors.

---

## 4. Test Cases

> Convention: **PASS** = expected behavior observed. **FAIL** = deviation. Each test ID maps to an SRS requirement.

---

### 4.1 Authentication & Authorization

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-AUTH-01 | Customer self-registration | POST `/auth/register` with valid email + password | 201, JWT returned, user row in DB | AUTH-01 |
| TC-AUTH-02 | Registration with weak password | POST with password "abc" | 400, validation error message | AUTH-07 |
| TC-AUTH-03 | Login — all roles | POST `/auth/login` for Customer, Staff, Delivery, Admin | 200, role-specific JWT returned | AUTH-02 |
| TC-AUTH-04 | Access wrong role's endpoint | Staff JWT → GET `/admin/reports` | 403 Forbidden | AUTH-05 |
| TC-AUTH-05 | Expired JWT | Use JWT after 7 days | 401 Unauthorized | AUTH-03 |
| TC-AUTH-06 | Deactivated account access | Admin deactivates Staff → Staff uses existing JWT | 401 or 403 (session invalidated) | AUTH-08 |
| TC-AUTH-07 | Password hashing | Inspect DB after registration | `password_hash` is a bcrypt hash, not plaintext | AUTH-06 |

---

### 4.2 Branch Management

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-BRANCH-01 | Admin creates a branch | POST `/admin/branches` with full payload | 201, branch in DB, visible in GET | BRANCH-01 |
| TC-BRANCH-02 | Admin deactivates a branch | PATCH `/admin/branches/:id/deactivate` | Branch `is_active = false` | BRANCH-02 |
| TC-BRANCH-03 | Customer sees only active branches | GET `/branches` as Customer | Deactivated branch absent from response | BRANCH-03 |
| TC-BRANCH-04 | Non-admin cannot manage branches | Staff JWT → POST `/admin/branches` | 403 Forbidden | AUTH-05 |

---

### 4.3 Product Catalog

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-PROD-01 | Staff creates product with option groups | POST `/products` with nested option groups | Product + groups created; visible in branch catalog | PROD-01 |
| TC-PROD-02 | Staff from Branch A edits Branch B product | Attempt PATCH on other branch's product | 403 or 404 | PROD-02 |
| TC-PROD-03 | Toggle product availability | PATCH `/products/:id/availability` | `is_available` flips; unavailable product greyed in catalog | PROD-04 |
| TC-PROD-04 | Customer views branch catalog | GET `/branches/:id/products` | Only available products fully visible; unavailable marked | PROD-06 |

---

### 4.4 Cart

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-CART-01 | Add item with options | POST `/cart/items` with product + selected options | CartItem created, `unit_price` computed correctly | CART-01, CART-06 |
| TC-CART-02 | Add item from different branch | Cart has Branch A item → add Branch B item | 409 with clear error message | CART-02, CART-03 |
| TC-CART-03 | Update quantity | PATCH `/cart/items/:id` with new quantity | Quantity updated, line total recalculated | CART-04 |
| TC-CART-04 | Remove item | DELETE `/cart/items/:id` | Item removed, cart total updated | CART-04 |
| TC-CART-05 | Cart persists after logout/login | Add items → logout → login → GET `/cart` | Same cart items returned | CART-05 |

---

### 4.5 Checkout & Payment

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-PAY-01 | Full checkout flow | POST `/orders` → POST `/payments` | Order created, cart cleared, `status = PENDING_CONFIRMATION`, payment `COMPLETED` | PAY-05 |
| TC-PAY-02 | Order items snapshot | Place order → change product price → GET `/orders/:id` | `order_items.unit_price` reflects original price | NFR-07 |
| TC-PAY-03 | Checkout with valid voucher | Apply voucher → checkout | `discount_amount` correct, `VoucherUsage` row created | PAY-07 |
| TC-PAY-04 | Voucher race condition | Two users simultaneously apply same single-use voucher | One order succeeds, other gets voucher-already-used error | VOUCH-06, NFR-09 |
| TC-PAY-05 | Checkout with empty cart | POST `/orders` with no cart items | 400 Bad Request | PAY-01 |

---

### 4.6 Voucher Validation

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-VOUCH-01 | Apply valid voucher | POST `/orders/validate-voucher` with valid code | Returns discount amount | VOUCH-04 |
| TC-VOUCH-02 | Expired voucher | Apply voucher past `expires_at` | 400, error code `VOUCHER_EXPIRED` | VOUCH-05 |
| TC-VOUCH-03 | Already used by this customer | Customer reuses own voucher code | 400, error code `VOUCHER_ALREADY_USED` | VOUCH-05 |
| TC-VOUCH-04 | Order below minimum | Apply voucher with min order 200k on 100k order | 400, error code `VOUCHER_MIN_ORDER_NOT_MET` | VOUCH-05 |
| TC-VOUCH-05 | Usage limit exhausted | Voucher `max_uses = 1`, already redeemed once | 400, rejected | VOUCH-05 |
| TC-VOUCH-06 | Admin deactivates voucher | PATCH `/admin/vouchers/:id/deactivate` → customer applies | 400 rejected | VOUCH-03 |

---

### 4.7 Standard Order FSM

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-ORD-01 | Staff confirms order | PATCH `/orders/:id/confirm` | Status → `CONFIRMED`, `estimated_ready_at` set | ORD-S03 |
| TC-ORD-02 | Order auto-cancels after 15 min | Create order → wait > 15 min without staff action | Status → `CANCELLED`, customer notified | ORD-S02 |
| TC-ORD-03 | Staff rejects order | PATCH `/orders/:id/reject` with reason | Status → `CANCELLED`, customer notification created | ORD-S04 |
| TC-ORD-04 | Staff advances preparation | PATCH `/orders/:id/status` PREPARING → READY | Status advances, each logged with timestamp + staff ID | ORD-S05, ORD-S06 |
| TC-ORD-05 | Invalid FSM transition | Staff tries `PENDING_CONFIRMATION` → `READY_FOR_PICKUP` directly | 422 Unprocessable Entity | ORD-S05 |
| TC-ORD-06 | Staff from wrong branch manages order | Staff from Branch B → confirm Branch A order | 403 Forbidden | ORD-S01 |
| TC-ORD-07 | Customer views status timeline | GET `/orders/:id` after multiple transitions | `history` array shows all statuses + timestamps | TRACK-01 |

---

### 4.8 Delivery

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-DEL-01 | Delivery staff views pickup pool | GET `/delivery/available` | Returns only `READY_FOR_PICKUP` unassigned orders | DEL-01 |
| TC-DEL-02 | Accept assignment | POST `/delivery/assignments` | `DeliveryAssignment` created, order → `ASSIGNED` | DEL-02 |
| TC-DEL-03 | Race condition — two staff claim same order | Simultaneous POST `/delivery/assignments` for same order | One succeeds (201), other gets 409 | DEL-06, NFR-08 |
| TC-DEL-04 | Decline assignment | PATCH `/delivery/assignments/:id/decline` | Order returns to pool (`ASSIGNED` → `READY_FOR_PICKUP`) | DEL-03 |
| TC-DEL-05 | Full delivery flow | PICKED_UP → OUT_FOR_DELIVERY → DELIVERED | Each status advance timestamped; customer order status synced | DEL-04, DEL-05 |
| TC-DEL-06 | Customer sees delivery staff name | GET `/orders/:id` after assignment | `delivery_staff_name` field populated | TRACK-03 |

---

### 4.9 Custom Orders

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-CUST-01 | Submit custom order | POST `/custom-orders` with all required options | `CustomOrder` + `CustomOrderOptions` created, status `PENDING_REVIEW` | CUST-01, CUST-03 |
| TC-CUST-02 | Delivery date < 48h | Submit with `desired_delivery_date` = tomorrow | 400, validation error | CUST-02 |
| TC-CUST-03 | Staff confirms custom order | PATCH `/custom-orders/:id/confirm` | Status → `CONFIRMED_BY_STAFF`, `deposit_amount` set | CUST-04 |
| TC-CUST-04 | Deposit payment | POST `/payments` with `custom_order_id` | Status → `DEPOSIT_PAID` → `IN_PRODUCTION` | CUST-05 |
| TC-CUST-05 | Custom order enters delivery pipeline | Staff sets `READY_FOR_PICKUP` | Appears in delivery pool; follows same FSM as standard order | CUST-06 |
| TC-CUST-06 | Staff rejects custom order | PATCH `/custom-orders/:id/reject` with reason | Status → `REJECTED`, customer notified | CUST-04 |
| TC-CUST-07 | Custom order option snapshot | Submit → admin changes option price → GET custom order | `custom_order_options.price_delta` reflects original values | NFR-07 |

---

### 4.10 Reviews

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-REV-01 | Review after delivery | Order status = `DELIVERED` → POST `/reviews` | Review created, visible on product page | REV-01, REV-04 |
| TC-REV-02 | Review before delivery | Order status = `PREPARING` → POST `/reviews` | 400, review not allowed | REV-01 |
| TC-REV-03 | Duplicate review | POST `/reviews` twice for same order + product | Second attempt returns 409 | REV-03, REV-05 |
| TC-REV-04 | Average rating | 3 reviews (3, 4, 5 stars) → GET `/products/:id` | `average_rating` = 4.0 | PROD-07 |

---

### 4.11 Admin

| ID | Scenario | Steps | Expected Result | SRS Ref |
|---|---|---|---|---|
| TC-ADMIN-01 | Create staff account | POST `/admin/users` with role STAFF + branch_id | Account created, assigned to branch | AUTH-04 |
| TC-ADMIN-02 | Deactivate staff account | PATCH `/admin/users/:id/deactivate` | `is_active = false`; existing JWT rejected | AUTH-08 |
| TC-ADMIN-03 | Create voucher | POST `/admin/vouchers` | Voucher created, code unique | VOUCH-01 |
| TC-ADMIN-04 | Analytics — date range | GET `/admin/reports/orders?from=X&to=Y` | Returns correct aggregated data for range | ADMIN-01, ADMIN-02 |
| TC-ADMIN-05 | Top products report | GET `/admin/reports/top-products` | Top 10 by order volume returned | ADMIN-01 |

---

### 4.12 Security & Edge Cases

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-SEC-01 | SQL injection in search | Pass `'; DROP TABLE orders; --` as query param | Parameterized query, no DB error, sanitized response |
| TC-SEC-02 | Unauthenticated access to protected route | GET `/staff/orders` with no JWT | 401 Unauthorized |
| TC-SEC-03 | IDOR — access another user's order | Customer A uses Customer B's `order_id` | 403 or 404 |
| TC-SEC-04 | Raw error exposure | Trigger an unhandled error | Response is `{ error: { code, message } }` — no stack trace |
| TC-SEC-05 | Inscription max length | Submit custom order with inscription > 30 chars | 400, validation error |

---

## 5. E2E Flows (Playwright)

These cover complete user journeys across the full stack.

| Flow | Roles Involved | Covers |
|---|---|---|
| **F01 — Standard Order** | Customer → Staff → Delivery | Branch select → product config → cart → checkout → confirm → prepare → deliver → review |
| **F02 — Custom Order** | Customer → Staff → Delivery | Custom builder → submit → staff review → deposit → production → deliver |
| **F03 — Voucher Application** | Customer | Apply valid voucher at checkout → discount reflected in total |
| **F04 — Order Auto-Cancel** | Customer → (no staff action) | Place order → wait 15 min → order cancelled → customer notified |
| **F05 — Admin Management** | Admin | Create branch → create staff → create voucher → view report |

---

## 6. Regression Checklist (Pre-Demo)

Run before the Sprint 10 demo. All items must pass.

- [ ] Fresh DB seed: `db:seed` populates 3 branches, 20+ products, 4 role accounts cleanly
- [ ] F01 Standard Order flow passes end-to-end
- [ ] F02 Custom Order flow passes end-to-end
- [ ] All 4 demo accounts (customer / staff / delivery / admin) log in successfully
- [ ] No raw Express errors visible in any API response
- [ ] `PaymentGateway` interface documented; swap instructions in `docs/PAYMENT-GATEWAY.md`
- [ ] All P0 test cases in §4 pass against staging DB
- [ ] Admin analytics load within 2 seconds
- [ ] Branch lock (TC-CART-02) confirmed working in browser

---

## 7. Bug Severity Classification

| Severity | Definition | Resolution SLA |
|---|---|---|
| **S1 — Critical** | Data loss, security breach, broken auth, payment failure | Fix before next commit |
| **S2 — High** | Core flow broken (can't place order, can't confirm), wrong FSM transition accepted | Fix within same sprint |
| **S3 — Medium** | Feature works but incorrect output, UI misalignment, non-critical 4xx/5xx | Fix in next sprint |
| **S4 — Low** | Cosmetic, typos, minor UX issues | Backlog |

---

*Document owner: Bakerio dev team. Update test cases as requirements evolve.*
