# Bakerio — Frontend Remediation Plan

Derived from the API Coverage Audit (`API Audit.html`). The audit identified gaps between the design folio, the api-client, and the Go backend. **No backend changes are permitted**, so every item below is solvable in the frontend.

---

## Phase A · API client clean-up (foundation for everything)

- [x] **A1.** Replace mock product fixtures with Vietnamese names from the design folio (Bánh mì Sài Gòn, Tart Quýt Hồng, etc.)
- [x] **A2.** Grow `mockCategories` from 4 → 8 (Bánh mì, Sourdough, Croissant, Pastry, Cake, Cà phê, Seasonal, Gift box)
- [x] **A3.** Add optional `allergens?: string[]` and `tag?: string` to the `Product` type and seed the fixtures
- [x] **A4.** Fix DTO drift: `createProduct` now takes `base_price` (was `price`); both mock and client signatures match
- [x] **A5.** Make the silent fallback to mock observable — add `markMock(key)` + `getApiHealth()` so the admin can show a "served from mock" indicator
- [x] **A6.** Wire suppliers + procurement to local stubs (audit §I — backend has neither module)
- [x] **A7.** Add `getOrderStats()` and `reorderItems()` to the orders mock — replaces hard-coded "47 lifetime orders" copy
- [x] **A8.** Create five new mock files: `inventory.ts`, `kitchen.ts`, `staff.ts`, `loyalty.ts`, `addresses.ts`
- [x] **A9.** Extend `analytics.ts` with `getMockHeatmap`, `getMockBranchLeaderboard`, `getMockAlerts`, `getMockTopSellers`
- [x] **A10.** Update `package.json` `exports` for the five new mock paths + re-export new functions from `src/index.ts`
- [ ] **A11.** Finish `client.ts` — restore the final `getOrderStats` / `reorderItems` re-exports under the ORDERS block (cut off mid-edit)

---

## Phase B · Admin app wiring

- [ ] **B1.** Dashboard (`(dashboard)/page.tsx`) — pull heatmap, leaderboard, alerts, top-sellers from `@repo/api-client/mock/analytics` instead of the local arrays I inlined
- [ ] **B2.** Orders board (`(dashboard)/orders/page.tsx`) — replace the hard-coded `COLS` array with `getOrders()` grouped by status, poll every 5 s via `setInterval` (audit §III)
- [ ] **B3.** Orders board — wire the "Start ▸ / Ready ✓ / Track ↗" buttons to `updateOrderStatus()`
- [ ] **B4.** Kitchen (`(dashboard)/kitchen/page.tsx`) — replace hard-coded `ORDERS` with `getKitchenTickets()` + `getKitchenCounts()` from `@repo/api-client/mock/kitchen`
- [ ] **B5.** Inventory (`(dashboard)/inventory/page.tsx`) — replace hard-coded `ITEMS` with `getInventory()` + `getInventoryHealth()` from `@repo/api-client/mock/inventory`
- [ ] **B6.** Users / Staff (`(dashboard)/users/page.tsx`) — render a real list from `getStaff()` + `getStaffCounts()`; keep the existing create-user dialog (real endpoint)
- [ ] **B7.** *(Optional)* Surface `getApiHealth().mockServed` in the top bar — a quiet "● 3 endpoints on mock" pill

---

## Phase C · Order app — honest stubs

- [ ] **C1.** Login (`/login/page.tsx`) — keep Apple/Google buttons but badge them "coming soon" (audit §III: backend has no SSO)
- [ ] **C2.** Checkout (`/checkout/page.tsx`) — same treatment for the payment methods, and wire `useCrumbs` to `getLoyalty()` + `maxRedeemableFor()` + `redeemCrumbs()`
- [ ] **C3.** Profile (`/profile/page.tsx`) — wire loyalty card to `getLoyalty()`, addresses list to `getAddresses()`; tag the "preferences" section "coming soon"
- [ ] **C4.** Orders list (`/orders/page.tsx`) — replace the lede's hard-coded "47 orders" with `getOrderStats().lifetime`; populate the tab counts from the same call
- [ ] **C5.** Build the missing tracking page (`/orders/[id]/page.tsx`) — abstract HCMC map, rider chip, timeline; poll `getOrder(id)` every 5 s; label fabricated parts ("estimated · visual only") to match the audit's honesty note
- [ ] **C6.** Wire the orders list "Reorder" link to `reorderItems(orderId)` → push into the cart store → redirect to `/cart`

---

## Phase D · Web (brand) app polish

- [ ] **D1.** `/menu/MenuContent.tsx` — read categories from `getCategories()` instead of the static `categories` export from `data/products.ts`; render the allergen checkboxes against `Product.allergens`
- [ ] **D2.** Home & featured tile — pull from `getProducts()` (now Vietnamese fixtures); ensures the design copy matches the data

---

## Phase E · Verification

- [ ] **E1.** `cd frontend/apps/web && npm run build`
- [ ] **E2.** `cd frontend/apps/order && npm run build`
- [ ] **E3.** `cd frontend/apps/admin && npm run build`
- [ ] **E4.** Spot-check each rewired page in the dev server (`npm run dev`) — verify mock fixtures render and no console errors

---

## Deferred (out of scope for "no backend" rule)

These appear in the audit but require backend work, so they stay as visible stubs:

- Payment integration (Apple Pay / VNPay / Momo SDK)
- Real-time WebSocket / SSE notifications
- Real delivery tracking (rider geolocation)
- Server-side shifts / clock-in
- Server-side `/users` list endpoint
- Loyalty / crumbs domain on the backend

---

## Recommended order

**A11 → B1–B6 → C1–C6 → D1–D2 → E.**

A is the foundation everything else depends on. B and C are independent and could be split across people. D is small. E is the final gate.
