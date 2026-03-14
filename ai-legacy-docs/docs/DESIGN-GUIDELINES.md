# Bakerio — Design Guidelines & Engineering Notes

> Version 1.0 | 2026-03-03
> Reference document for future revisions, design reviews, and onboarding.

---

## 1. How to Revise the Design Documents

### PRD.md
- Acceptance criteria must be testable — if you can't write a test case from it, rewrite it
- Every P0 feature must have a corresponding sprint task
- Remove any requirement not backed by a user story
- Resolve every open assumption before Sprint 4 (when order logic gets complex)

### ARCHITECTURE.md
- Revisit ADRs if a decision turns out wrong in practice — mark them superseded, don't delete
- Update the directory tree as the actual repo structure solidifies (Sprint 0)
- Add a new ADR any time the team makes a significant tech decision mid-project

### API-SPEC.md
- After Sprint 0, align field names with the actual Prisma schema — they will drift
- Add real response examples from `curl` tests as each module is built
- Mark endpoints `[IMPLEMENTED]` / `[STUB]` / `[PLANNED]` so the real state is always visible

### UI-FLOWS.md
- Replace ASCII wireframes with Figma/Excalidraw links once actual designs exist
- Update status badge colors when the frontend palette is finalized
- Annotate which components are reused across flows (e.g., `OptionCard` appears in 3 flows)

---

## 2. Critical Points to Watch in Software Design

### 2.1 State Machine Integrity
The order has 10+ statuses. The most dangerous bug is an illegal transition (e.g., PENDING → DELIVERED without intermediate steps). Enforce the FSM in the **service layer**, not in the frontend or DB triggers. Write unit tests for every valid and every invalid transition.

### 2.2 Price Immutability
Never recalculate order totals from current product prices after checkout. The snapshot pattern in `order_items.selected_options_snapshot` and `unit_price` protects you. Do not break this by being clever — a product price change must never affect a paid order.

### 2.3 Delivery Assignment Race Condition
Two delivery staff tapping "Accept" at the same millisecond must not both claim the same order. Enforce with a DB-level unique constraint on `delivery_assignments.order_id` combined with `SELECT FOR UPDATE`, not application-level checks alone.

### 2.4 Voucher Race Conditions
A voucher with `max_uses = 1` can be claimed twice by simultaneous requests. Enforce the usage limit inside the same DB transaction as order creation — not in a pre-check before it.

### 2.5 Module Boundary Discipline
The monolith's biggest long-term risk: modules accessing each other's DB tables directly. If `orders` starts importing Prisma queries from `products`, future microservice extraction becomes a rewrite. Rule: call service functions across modules, never raw DB queries.

### 2.6 Input Validation at the Boundary
Validate everything at the API layer (Zod schemas) before it touches any service. Never trust that the frontend sent valid data — especially option IDs, quantity ranges, date fields, and voucher codes.

### 2.7 Auto-Cancel Reliability
The 15-minute order auto-cancel is a background job. If it silently fails, customers are stuck waiting. Log every auto-cancel event. Alert (even just to console) if the job hasn't run in > 20 minutes.

### 2.8 Snapshot vs. Reference on Order Items
`order_items` stores both a `product_id` (soft reference for analytics) and a full `selected_options_snapshot` (immutable truth). Never use `product_id` to re-derive what the customer ordered — use the snapshot.

---

## 3. Design Tradeoffs

| Tradeoff | Chosen | Given Up | Why It Was Worth It |
|---|---|---|---|
| Monolith vs microservices | Monolith | Independent per-service scaling | 2-person team can't manage infra for 5+ services in 15 weeks |
| Polling vs WebSockets | 30s polling | True real-time updates | Zero extra infra; acceptable UX for order tracking; trivially replaceable with SSE later |
| Snapshot prices vs live prices | Snapshot at checkout | Always-current prices on old orders | Order integrity — a price change can't retroactively alter a paid order |
| Structured options vs free text | Structured only | Maximum creative freedom | Staff can reliably execute structured requests; free text leads to miscommunication and scope creep |
| Mock payment first | Mock adapter | Real payment from day 1 | Unblocks the entire order flow in Sprint 4; gateway swap is a single adapter file |
| Flat delivery fee | Fixed fee | Distance-based pricing | Accurate routing is its own project; flat fee is honest and simple for v1 |
| Polling for notifications | DB-backed polling | Push notifications | No FCM/APNs setup needed; polling hook is a one-line swap for SSE later |
| Single DB (PostgreSQL) | PostgreSQL only | Redis caching layer | No cache invalidation complexity; premature optimization at school-project scale |
| 30-char inscription limit | Hard cap | Unrestricted personalization | Prevents layout-breaking text; encourages concise messages; staff can read it at a glance |
| No real-time GPS tracking | Status-based tracking | Live delivery map | GPS tracking requires mobile app + mapping SDK + significant backend work; statuses cover the UX need |

---

## 4. Scope Escalation Triggers

Flag these as risk events if they come up during development:

| Trigger | Risk | Response |
|---|---|---|
| Staff requests free-text custom order notes | Scope creep into v1 | Defer to v2; add `staff_note` field only, not customer-facing |
| Customer requests order cancellation | New cancellation flow needed | Scope only `PENDING_CONFIRMATION` cancellation; no mid-preparation cancellation |
| Multiple vouchers per order | Stacking logic complexity | Hard no in v1; single voucher is a product decision, not a limitation |
| Delivery staff requests in-app map | GPS/mapping scope | Defer; address text is sufficient for v1 |
| Payment gateway sandbox issues | Sprint 5+ blocked | Fall back to mock; document what needs to change for real gateway |
| Custom order deposit negotiation | Pricing logic complexity | Deposit is always 30% flat, calculated by system, not negotiable |

---

## 5. AI Usage Protocol

### The Gate Rule

Before handing any task to AI, the human must be able to answer:
> *"What is the exact function signature, input type, and expected output — in one sentence?"*

If you can answer it → AI writes the body. You review it.
If you cannot → decompose further. You are not ready.

### What AI Can Do

- Write the body of a single, named function with defined inputs and outputs
- Generate a Zod validation schema for a documented request body
- Write a single unit test body given the function and its edge case
- Translate a documented FSM transition into a switch/if block

### What AI Cannot Do (Human Owns)

| Area | Why |
|---|---|
| FSM transition rules | AI does not know your canonical FSM — it will invent plausible but wrong transitions |
| Snapshot enforcement | AI defaults to recalculating from live data; you must specify the snapshot rule explicitly |
| Module boundary calls | AI crosses module boundaries freely; you enforce the service-only rule at review |
| Race condition patterns | AI writes optimistic code; you specify the transaction and lock pattern |
| Logical/business decisions | Any question whose answer is "it depends on the business" — see sprint `⚠️ Decisions Required` blocks |
| Notification copy / error messages | AI writes generic text; human decides tone, wording, and brand voice |

### Review Checklist (after every AI output)

Before committing AI-written code:

- [ ] Does it match the documented function signature exactly?
- [ ] Does it follow the FSM in `ARCHITECTURE.md §10` — no invented transitions?
- [ ] Does it use snapshots where required — no live price recalculation after checkout?
- [ ] Does it call across modules via service functions only — no cross-module Prisma queries?
- [ ] Does it validate inputs at the boundary — no raw body access inside the service layer?
- [ ] Does it return the correct error code shape from `API-SPEC.md`?

---

## 6. Definition of Done (per feature)

A feature is done when all of the following are true:

- [ ] API endpoint returns correct response for happy path
- [ ] API endpoint returns correct error codes for all documented error cases
- [ ] Service layer unit test covers the main logic and at least one edge case
- [ ] Frontend renders the feature without console errors
- [ ] Feature matches the acceptance criteria in PRD.md
- [ ] No hardcoded secrets, IDs, or magic strings in the code
- [ ] PR reviewed by both team members before merge

---

## 7. Revision Log

| Date | Author | Change |
|---|---|---|
| 2026-03-03 | Team | Initial document created |
| 2026-03-09 | Team | Added §5 AI Usage Protocol; renumbered sections |

---

*This document should be reviewed at the start of each sprint and updated whenever a design decision changes.*
