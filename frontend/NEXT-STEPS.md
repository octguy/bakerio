# Frontend Development — Next Steps Plan

> **Date:** 2026-05-19
> **Current state assessment + prioritized roadmap**

---

## Current State

| App | Status | What exists |
|-----|--------|-------------|
| `apps/web` | ✅ 90% done | All pages (home, menu, locations, about, blog, contact), GSAP animations, SEO (sitemap, robots), responsive. 3 bugs from QA report. |
| `apps/order` | 🟡 40% done | Branch selection, menu browse, product detail, cart (Zustand), checkout page. All using mock data. No auth, no real API, no order tracking. |
| `apps/admin` | ❌ Scaffold only | Default Next.js boilerplate. No pages built. |
| `packages/ui` | 🟡 Tokens only | Design tokens exported. No shared components yet. |
| `packages/api-client` | ✅ 80% done | Real API calls for auth, products, categories, branches, suppliers, procurement, users. Mock for orders. |
| `packages/eslint-config` | ✅ Done | base, next, react-internal configs. |
| `packages/typescript-config` | ✅ Done | base, nextjs, react-library configs. |
| **E2E tests** | ✅ Just added | 19 Playwright tests (web + order). All passing. |

---

## Priority 1: Fix Web Bugs + Ship Branding Site (1-2 days)

The branding site is nearly production-ready. Fix the 3 critical bugs from the QA report:

| # | Bug | Fix |
|---|-----|-----|
| BUG-001 | Blog detail pages 404 | Add `generateStaticParams()` to `blog/[slug]/page.tsx` |
| BUG-002 | `/careers` linked but doesn't exist | Remove link from Footer or create a placeholder page |
| BUG-003 | `/order` linked but doesn't exist | Point CTA to `order.bakerio.vn` (external) or `/menu` |

**Also fix warnings:**
- Duplicate "Bakerio" in title → check `metadata.title.template` (should be `"%s | Bakerio"` not `"%s | Bakerio | Bakerio"`)
- Add unique meta descriptions per page
- Add `og:image` meta tag
- Add security headers in `next.config.ts`

**Deliverable:** Branding site deployable to production.

---

## Priority 2: Order App — Connect to Real Backend (1 week)

The order app has UI but runs entirely on mock data. Wire it to the real API:

### 2.1 Auth Flow
- [ ] Login page (`/login`) — email + password form
- [ ] Register page (`/register`) — email + password + full name
- [ ] OTP verification page (`/verify`)
- [ ] Auth context/provider — store JWT in cookie, auto-refresh
- [ ] Protected routes — redirect to login if unauthenticated

### 2.2 Real Data Integration
- [ ] Replace `src/data/mock.ts` branches with `api.getBranches()`
- [ ] Replace mock products with `api.getProducts()` (filtered by category)
- [ ] Product detail fetches from `api.getProduct(id)`
- [ ] Cart persists to localStorage, submits to real order endpoint (when backend ships)

### 2.3 Missing UI
- [ ] Header with auth state (login/profile button, cart badge)
- [ ] Bottom navigation (mobile)
- [ ] Order history page (`/orders`)
- [ ] User profile page (`/profile`)

### 2.4 Polish
- [ ] Loading skeletons for data fetches
- [ ] Error boundaries
- [ ] VND formatting throughout (`Intl.NumberFormat("vi-VN")`)
- [ ] Responsive: mobile-first, test on 375px–1440px

---

## Priority 3: Admin Panel — Core Pages (2-3 weeks)

The admin panel is the most complex app. Build in this order:

### 3.1 Foundation (2-3 days)
- [ ] Install shadcn/ui + configure with Bakerio tokens
- [ ] Auth: login page + JWT cookie + auth guard
- [ ] Dashboard layout: sidebar nav + header + breadcrumbs
- [ ] Role-based nav (show/hide menu items based on permissions)

### 3.2 CRUD Pages — Read-first (1 week)
Build list views first (read-only), then add create/edit:

| Page | API Ready? | Priority |
|------|-----------|----------|
| Products list + create/edit | ✅ | P0 |
| Categories list + create/edit | ✅ | P0 |
| Branches list + create/edit | ✅ | P0 |
| Users/Staff list + create | ✅ | P0 |
| Suppliers list + create/edit | ✅ | P1 |
| Procurement orders + status transitions | ✅ | P1 |
| Orders list + detail (mock until backend ships) | ❌ Mock | P2 |
| Inventory (mock until backend ships) | ❌ Mock | P2 |

### 3.3 Dashboard (3 days)
- [ ] Stats cards (total orders, revenue, active products, low stock)
- [ ] Charts (daily revenue, orders by status) — Recharts
- [ ] Recent orders table
- [ ] Low stock alerts

### 3.4 Shared Patterns to Establish
- DataTable component (TanStack Table + shadcn)
- Form pattern (React Hook Form + Zod + shadcn form components)
- Confirmation dialogs for destructive actions
- Toast notifications for success/error
- Pagination + search + filter pattern

---

## Priority 4: Shared UI Package (ongoing, parallel)

Extract reusable components as they stabilize:

- [ ] Button (primary, secondary, ghost, destructive variants)
- [ ] Input, Select, Textarea with Bakerio styling
- [ ] Card component
- [ ] Badge (status badges for orders, PO states)
- [ ] Modal/Dialog
- [ ] DataTable (once admin pattern is proven)
- [ ] Toast/Notification

---

## Infrastructure & DX

| Task | When |
|------|------|
| Add `@repo/api-client` as dependency to order + admin apps | Priority 2 start |
| Set up `.env.local` per app with `NEXT_PUBLIC_API_URL` | Priority 2 start |
| Add Playwright tests for admin (auth flow, CRUD smoke tests) | Priority 3 end |
| CI: GitHub Actions runs `turbo build` + `playwright test` on PR | After Priority 2 |
| Production Docker builds per app | Before first deploy |

---

## Recommended Execution Order

```
Week 1:     P1 (web bugs) + P2.1-2.2 (order auth + real data)
Week 2:     P2.3-2.4 (order polish) + P3.1 (admin foundation)
Week 3-4:   P3.2-P3.3 (admin CRUD + dashboard)
Week 5+:    P4 (shared UI extraction)
```

---

## Key Decisions Still Needed

1. **Order app: SSR or CSR?** Currently all client components. If SEO matters for menu pages (public browsing), convert menu to Server Components with `api-client` calls at the server level.

2. **Admin state management:** React Query (TanStack Query) for server cache + Zustand for UI state? Or keep it simpler with just fetch + useState for v1?

3. **Real-time order tracking:** WebSocket directly from Next.js client, or proxy through a Next.js API route? The backend already has RabbitMQ → WS planned.

4. **Image hosting:** Currently using Unsplash URLs (some are 404). Switch to backend's `/uploads/` endpoint for product images? Or use a CDN/S3 bucket?

5. **i18n:** The web PLAN.md mentions `next-intl` for VN/EN. Implement now or defer to Phase 3 (branding website polish)?
