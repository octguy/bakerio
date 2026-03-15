# Bakerio — Critical Flaws Log

> For presenting to teammates, professors, or code reviewers.
> Each entry: what the flaw is, why it matters, and how it was fixed.

---

## Iteration 1 Fixes (2026-03-03)

---

### FLAW-01 — Delivery Fee Existed in UI But Not in the Database

**Severity:** Critical — would have caused a bug on day 1 of Sprint 4.

**What it was:**
The checkout screen showed a delivery fee. The `POST /orders` API spec referenced it. But the `orders` table in the schema had no `delivery_fee` column. The total_amount calculation was also wrong: `subtotal - discount` with no delivery fee added.

**Why it matters:**
The first time someone ran the checkout endpoint, the `total_amount` would be wrong. Every order record would have an incorrect total. This is financial data — it cannot be patched retroactively without a data migration.

**Fix applied:**
- Added `delivery_fee DECIMAL` column to `orders` table (default `20000`)
- Added `DELIVERY_FEE` to `.env.example` and env var table in ARCHITECTURE.md
- Updated `total_amount` formula: `subtotal - discount_amount + delivery_fee`

---

### FLAW-02 — Three Separate Documents Each Defined the Order Status FSM Differently

**Severity:** Critical — guarantees implementation bugs when two developers read from different sources.

**What it was:**
`business-plan.md`, `PRD.md` (ORD-01), and `API-SPEC.md` (comments on PATCH /orders/:id/status) each described the order status FSM. The wording was slightly different in each. The custom order FSM was only in `business-plan.md`.

**Why it matters:**
One developer implements the backend FSM from `business-plan.md`. The other implements the frontend status badge from `PRD.md`. They diverge. The bug only shows up in integration, which in a 15-week project is Sprint 8.

**Fix applied:**
- Single canonical FSM defined in `ARCHITECTURE.md §10` — both standard and custom order
- Notification events triggered per transition also defined there
- `business-plan.md` and `PRD.md` now reference ARCHITECTURE.md §10 instead of re-defining

---

### FLAW-03 — Deactivated Staff Accounts Could Still Use the API for Up to 7 Days

**Severity:** Critical — security vulnerability.

**What it was:**
JWT expiry was 7 days. AUTH-03 noted refresh tokens as optional. There was no mechanism to invalidate a JWT when a staff account was deactivated. An admin could deactivate a staff member, but their JWT would remain valid for up to 7 days — allowing them to continue confirming orders, editing products, and accessing branch data.

**Why it matters:**
Staff turnover is real. A terminated employee retaining full API access is a data integrity and security risk. In a real deployment this would be a serious incident.

**Fix applied:**
- Added `AUTH-08` to PRD.md: deactivation immediately invalidates session
- Added `token_version: Int` field to `users` table (recommended mechanism in PRD §7)
- Middleware checks: `jwt.token_version === user.token_version` on every protected request
- Deactivation increments `token_version` — all existing JWTs immediately fail

---

### FLAW-04 — Sprint 4 Had ~40 Hours of Work in a 24-Hour Sprint

**Severity:** Critical — the sprint plan would have failed in week 8.

**What it was:**
Sprint 4 contained 7 tasks covering: checkout transaction, mock payment, staff order queue, confirm/reject flows, auto-cancel background job, order status timeline, and customer order history. Each task requires backend service + API endpoint + frontend integration + tests. Realistic estimate: 40–48 person-hours.

**Why it matters:**
When a sprint fails, teams skip testing to catch up. Skipped tests mean bugs found in integration instead of unit. The auto-cancel job in particular — background job scheduling, failure handling, timezone issues — is easily a 4–6 hour task by itself.

**Fix applied:**
- Sprint 4 split into 4a (Checkout & Payment, ~16h) and 4b (Staff Management + Auto-Cancel, ~15h)
- Each task in Sprint 4a/4b now has an hour estimate
- Auto-cancel job explicitly scoped: runs every 60s, logs every action, retries once on failure

---

### FLAW-05 — No Custom Order Review Timeout

**Severity:** High — customer can be left waiting indefinitely with no recourse.

**What it was:**
Standard orders had a 15-minute auto-cancel if staff didn't confirm. Custom orders had no equivalent. A staff member could ignore a custom order request permanently. The customer submitted a deposit-requiring order for a wedding cake due in 48 hours and had no way to know if it would ever be reviewed.

**Why it matters:**
48-hour lead time is short. If a 4-hour window passes with no staff review, the customer may miss the preparation window. This is a business trust problem, not just a UX annoyance.

**Fix applied:**
- Added `CUST-10` to PRD.md: 4h timeout with customer notification + admin escalation
- At 8h: auto-reject with reason "No response from branch"
- Added `CUSTOM_ORDER_REVIEW_TIMEOUT_H` env var
- Added `CUSTOM_ORDER_REVIEW_ESCALATION` notification event to canonical event table

---

### FLAW-06 — `POST /payments` Accepted Ambiguous Payloads

**Severity:** High — undefined behavior when both or neither `order_id`/`custom_order_id` are provided.

**What it was:**
The payment endpoint accepted either `order_id` or `custom_order_id` — but no validation rule specified what happened if a client sent both, or neither. In a real scenario, a bug in the frontend could send both, resulting in undefined behavior: charge the customer twice? Apply payment to wrong order? Silently fail?

**Fix applied:**
- Explicit rule in API-SPEC.md: exactly one of the two fields must be present
- Providing both or neither returns `422 PAYMENT_TARGET_AMBIGUOUS`

---

### FLAW-07 — `PATCH /auth/me` Could Accept `role: "ADMIN"` Without Error

**Severity:** High — privilege escalation vector.

**What it was:**
The PATCH /auth/me endpoint said "update own profile (name, phone, address)" but the spec did not explicitly say that `role`, `email`, `is_active`, and `password` were blocked. A client could send `{ "role": "ADMIN" }` and it was unspecified whether this was silently ignored or applied.

**Why it matters:**
If a developer implemented this by spreading the request body onto the update payload (a common beginner mistake), any customer could escalate their own role to ADMIN. This is a P0 security issue.

**Fix applied:**
- Explicit note in API-SPEC.md: allowed fields are only `full_name`, `phone`, `address`
- Zod schema for this endpoint strips all other fields before hitting the service
- Any other field is silently dropped — no error, no effect

---

### FLAW-08 — No Database Index Strategy

**Severity:** High — would cause slow queries the moment real data appeared.

**What it was:**
The schema defined 15 tables with FK relationships. No indexes were specified beyond the implicit primary key indexes. The most common queries (staff order queue by `branch_id + status`, customer order history by `user_id`, auto-cancel cron by `status + created_at`) would result in full table scans as the orders table grew.

**Fix applied:**
- Added `ARCHITECTURE.md §6`: 14 required indexes documented with the query each serves
- Unique constraint on `delivery_assignments(order_id)` WHERE `status != 'DECLINED'` as the race condition prevention mechanism

---

### FLAW-09 — No Transaction Boundary Documentation

**Severity:** High — guaranteed data corruption bugs on checkout failures.

**What it was:**
Checkout involves 7 database operations (validate voucher, create order, create order_items, clear cart, create payment, increment voucher usage, create voucher_usage). None were specified as transactional. If the server crashed between step 3 and step 4, a customer could have a cart that appears cleared but no order created, or an order with no payment record.

**Fix applied:**
- Added `ARCHITECTURE.md §7`: explicit transaction boundaries for checkout, custom order deposit, and delivery assignment
- Documented the atomic `UPDATE vouchers SET used_count = used_count + 1 WHERE used_count < max_uses` pattern

---

### FLAW-10 — Color Palette Had a WCAG Accessibility Failure

**Severity:** Medium — affects ~8% of users with low vision.

**What it was:**
Golden `#E8A020` was specified as the color for price highlights on white backgrounds. The actual contrast ratio is 2.8:1, which fails WCAG AA (requires 4.5:1 for normal text, 3:1 for large text).

**Why it matters:**
Price labels are among the most important text on an e-commerce screen. Making them unreadable for visually impaired users is both a UX failure and a legal accessibility risk in many jurisdictions.

**Fix applied:**
- Color palette table in UI-FLOWS.md now includes contrast ratios and WCAG AA pass/fail for each combination
- Golden `#E8A020` restricted to decorative elements only (star icons, borders)
- New `Accent (text safe)` color: Dark Amber `#92610A` (4.6:1 on white) for all price text

---

### FLAW-11 — No App Navigation Map

**Severity:** Medium — developers would implement navigation inconsistently.

**What it was:**
UI-FLOWS.md had individual screen wireframes but no map showing how screens connect. Back button behavior on the 7-step custom builder wizard was undefined. Post-checkout navigation (where does the customer land after payment?) was undefined.

**Fix applied:**
- Added `UI-FLOWS.md §0`: full navigation maps for all 4 role apps with directional arrows
- Explicit back-button behavior for custom builder wizard: preserves selections, does not reset
- Post-payment destination: Order Confirmation → Order Tracking

---

### FLAW-12 — No Error State Wireframes

**Severity:** Medium — error states written as an afterthought always look bad.

**What it was:**
Every wireframe showed the happy path. No wireframes for: failed payment, cart branch conflict, order auto-cancelled, invalid voucher (multiple types), skeleton loading, empty delivery pool.

**Fix applied:**
- Added `UI-FLOWS.md §5`: 6 error/empty state wireframes covering all critical failure scenarios
- Voucher errors show specific messages for each failure code
- Skeleton loading wireframe defined with minimum display time (300ms)

---

## Iteration 2 (Planned)

> To be completed after Sprint 0. Will review:
> - Actual Prisma schema against documented schema
> - API-SPEC against first implemented endpoints
> - Sprint 1-2 retrospective findings

---

## Iteration 3 (Planned)

> To be completed after Sprint 5 (mid-project). Will review:
> - Integration test coverage
> - Performance under simulated load
> - Frontend component reuse vs. spec
