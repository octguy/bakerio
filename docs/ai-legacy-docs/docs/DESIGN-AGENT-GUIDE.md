# Bakerio — Design Agent Guide

> Version 1.0 | 2026-03-09
> Audience: AI Agent assisting with UI/UX design tasks
> This document tells you what is already decided, what requires human input, and how to approach complex design features.

---

## 1. What You Must Read First

Before doing any design task, read these in order:

1. `COMPONENT-SPEC.md` — exact specs for every component. Do not invent values.
2. `DESIGN-BRIEF.md` — Figma setup, token system, design rules, UX principles per role.
3. `UI-FLOWS.md` — existing wireframes and navigation maps. These are the approved layout direction.
4. `SRS.md §3–4` — user roles and functional requirements. Design must serve these.
5. `ARCHITECTURE.md §10` — canonical order FSM. Status badge colors are derived from this.

---

## 2. What Is Already Decided (Do Not Change)

These decisions are final. If a design task conflicts with them, flag it to the human — do not work around it.

| Decision | Value | Source |
|---|---|---|
| Color palette | Defined in `DESIGN-BRIEF.md §3` | UI-FLOWS.md |
| Status badge colors | Defined in `COMPONENT-SPEC.md §3` | ARCHITECTURE.md §10 |
| Font | Inter | DESIGN-BRIEF.md |
| Spacing grid | 8pt (multiples of 4px) | DESIGN-BRIEF.md |
| Mobile viewport | 390px | DESIGN-BRIEF.md |
| Desktop viewport | 1280px (staff/admin only) | DESIGN-BRIEF.md |
| Minimum tap target | 44×44px | DESIGN-BRIEF.md |
| Custom builder input type | Structured options only — no free text except inscription (max 30 chars) | SRS.md CUST-01 |
| Payment UI | Mock only in Phase 1 — no real gateway UI | SRS.md PAY-03 |
| Delivery tracking | Status-based — no GPS map | SRS.md out of scope |
| Notification method | In-app only — no push notification UI | SRS.md TRACK-04 |

---

## 3. What Requires Human Decision Before You Proceed

If your task touches any of these areas, stop and ask the human before designing:

- Notification copy / error message wording — human decides tone and brand voice
- Any new screen not in `UI-FLOWS.md` — human must approve the new flow first
- Any component not in `COMPONENT-SPEC.md` — human must approve before you spec it
- Animation / transition behavior — not yet defined, human decides
- Onboarding or empty-state illustrations — human decides art direction
- Any feature in the Out of Scope list in `SRS.md §8`

---

## 4. How to Approach Complex Features

### 4.1 Custom Cake Builder Wizard (7 Steps)

**What it is:** A multi-step form where the customer selects structured options one group at a time to configure a custom cake. 7 steps total.

**The 7 steps (in order):**
1. Size
2. Base Flavor
3. Frosting
4. Color Palette
5. Decoration Theme
6. Add-on Decorations (multi-select)
7. Writing Style + Inscription + Candle Style + Delivery Date → Summary

> Step 7 combines the remaining smaller fields into one screen to avoid single-question screens.

**Layout pattern for each step:**
```
[ ← Back ]  [ Step X of 7 ]  [ progress bar ]
─────────────────────────────────────────────
[ Step title ]
[ Step description (1 line) ]

[ OptionCard grid — 2 columns ]

─────────────────────────────────────────────
[ Running total: 245,000 ₫ ]  [ Next → ]  (sticky bottom bar)
```

**Rules:**
- Progress bar fills proportionally to current step (step 3 = 3/7 = 43% filled)
- Back button preserves all previous selections — never resets
- Next button disabled until required selection made (all steps are required except step 7 optional fields)
- Running total updates immediately when an option is selected
- On the Summary screen (after step 7): show all selections grouped by step with edit links back to each step
- "Add to Cart" only appears on the Summary screen, not on individual steps

**States to design per step:**
- Default (no selection yet)
- Option selected
- Loading (if options are fetched async)
- Error (if options fail to load)

---

### 4.2 Checkout Flow

**What it is:** A 3-screen linear flow: Review → Address → Payment → Confirmation.

**Screen 1 — Order Review:**
```
[ Navbar: "Checkout" ]
[ Branch name + items list (read-only CartItem variant) ]
[ Voucher code input ]
[ Applied discount row (if voucher valid) ]
[ ─────────────── ]
[ Subtotal row ]
[ Delivery fee row ]
[ Discount row (if applicable) ]
[ Total row — bold, large ]
[ Next: Confirm Address → ] (sticky bottom)
```

**Screen 2 — Delivery Address:**
```
[ Navbar: "Delivery Address" ← ]
[ Pre-filled address from profile ]
[ Edit address input (if tapping edit) ]
[ Map static preview (v2 — skip in v1, show text only) ]
[ Confirm Address → ] (sticky bottom)
```

**Screen 3 — Payment (Mock Phase 1):**
```
[ Navbar: "Payment" ← ]
[ Order summary: total amount, large ]
[ Payment method: "Pay Online" (mock — no card form) ]
[ Final total breakdown (condensed) ]
[ Place Order — primary lg, full width ] (sticky bottom)
[ Small text: "You will be charged X" ]
```

**Screen 4 — Confirmation:**
```
[ Full-screen success state ]
[ ✓ icon (large, color/success) ]
[ "Order Placed!" — text/display ]
[ Order #XXXXXXXX — text/subheading, color/accent ]
[ "We'll notify you when [Branch] confirms your order" ]
[ Track Order → ] (primary)
[ Back to Home ] (ghost)
```

**Error states to design:**
- Voucher invalid (inline error below voucher input — specific message per error type)
- Payment failed (replace confirmation screen with error state + retry button)
- Out of stock detected at checkout (inline warning on affected item + block proceed)

---

### 4.3 Order Status Timeline

**What it is:** A vertical step indicator showing the order's progress through all statuses.

**Layout:**
```
● PENDING_CONFIRMATION    Mar 9, 14:32
│
● CONFIRMED               Mar 9, 14:35  ← "Estimated ready: 15:30"
│
● PREPARING               Mar 9, 14:36
│
○ READY_FOR_PICKUP        —
│
○ OUT_FOR_DELIVERY        —
│
○ DELIVERED               —
```

**Visual rules:**
- Completed step: filled circle `color/primary`, solid line below
- Current step: filled circle `color/primary` with pulse animation, dashed line below
- Future step: empty circle `color/border`, dashed line below
- Each step shows: status label (`text/body-medium`), timestamp or `—` if not yet reached
- Timestamp: `text/caption`, `color/muted`
- Additional info (estimated ready time, delivery staff name) shown as indented note below the relevant step

**Cancelled state:**
- All steps after the cancellation point greyed out
- Cancelled step shows red circle + "Cancelled" label + reason in note

---

### 4.4 Staff Order Queue (Dashboard)

**What it is:** A paginated list of orders for the staff's branch, sorted by creation time.

**Layout (mobile):**
```
[ Navbar: "[Branch Name] — Orders" ]
[ Tab bar: All | New (badge) | In Progress | Ready ]
[ Search / filter row ]
[ OrderRow list — card variant ]
[ Paginator ]
```

**Layout (desktop, 1280px):**
```
[ Sidebar: nav links ]  |  [ Orders table ]
                           [ Columns: Order ID | Customer | Items | Total | Time | Status | Actions ]
                           [ Paginator ]
```

**New order treatment:**
- Left border: 4px `color/primary`
- Background: `color/primary` at 3% opacity
- Countdown timer shown: "Confirm within 12:43" — color turns `color/error` when < 5 minutes
- Timer disappears after confirmation

**Action buttons per order (in table row):**
- `PENDING_CONFIRMATION`: [Confirm] (primary sm) [Reject] (destructive sm)
- `CONFIRMED` / `PREPARING`: [Update Status →] (secondary sm)
- `READY_FOR_PICKUP`: [Waiting for pickup] (disabled, neutral badge)
- `CANCELLED`: No actions

---

### 4.5 Admin Analytics Dashboard

**What it is:** A data-heavy desktop dashboard showing business metrics.

**Layout (1280px):**
```
[ Sidebar ] | [ Header: "Analytics" + date range picker ]
              [ ─── KPI Cards row ─── ]
              [ Total Orders ] [ Total Revenue ] [ Active Branches ] [ Top Product ]

              [ ─── Charts row ─── ]
              [ Orders by date (line chart, left 60%) ] [ Orders by branch (bar, right 40%) ]

              [ ─── Table ─── ]
              [ Top 10 Products by volume ]
```

**KPI Card anatomy:**
```
[ Metric label — text/label, color/muted ]
[ Value — text/display, color/body-text ]
[ ▲ +12% vs last period — text/caption, color/success or color/error ]
```

**Rules:**
- Date range picker: presets (Last 7d / Last 30d / Custom range)
- Revenue always in `₫` with thousands separator
- Charts: use a chart library (Recharts recommended) — do not design charts as static images
- Empty state (no data for range): show a neutral illustration + "No orders in this period"
- Loading state: skeleton KPI cards + skeleton chart placeholder rectangles

---

## 5. General Design Approach for Any New Feature

When asked to design a feature not covered above, follow this sequence:

1. **Identify the user role** — whose screen is this? Read their goals from `SRS.md §3`.
2. **Find the user story** — look up the relevant US-* in `business-plan.md §3`. Read the acceptance criteria — these are your design requirements.
3. **Check UI-FLOWS.md** — is there an existing wireframe? If yes, use it as the layout starting point.
4. **Identify the data** — what information does this screen display? List every field before laying out anything.
5. **Design the happy path** — the main flow with all data present.
6. **Design the edge cases** — empty state, loading state, error state.
7. **Apply component specs** — use only components from `COMPONENT-SPEC.md`. If you need a new component, flag it to the human.
8. **Check the rules** — run through the Handoff Checklist in `DESIGN-BRIEF.md §9`.

---

## 6. When to Stop and Ask the Human

Stop immediately and ask if:

- The feature requires a decision not documented anywhere
- The wireframe in `UI-FLOWS.md` is ambiguous and you would have to guess
- You need a new component not in `COMPONENT-SPEC.md`
- The task conflicts with a decision in the "Already Decided" table above
- You are unsure which of two valid design approaches to take — present both options, let the human choose

Do not guess on decisions. Do not invent component styles. Do not redesign around a constraint — flag it.

---

## 7. Revision Log

| Date | Author | Change |
|---|---|---|
| 2026-03-09 | Team | Initial document — 5 complex features specified |
