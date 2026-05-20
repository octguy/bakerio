# Frontend Development Plan

> **Date:** 2026-05-20  
> **Constraint:** No backend modifications. Use existing APIs; mock everything else client-side.

---

## Current Reality

### Backend APIs Available (REAL)
| Module | Endpoints |
|--------|-----------|
| Auth | login, register, logout |
| Products | CRUD (list, get, create, update, delete) |
| Categories | CRUD |
| Branches | CRUD |
| Suppliers | list, create |
| Procurement | list orders, create, update status |
| Users | create, get profile, get my profile, update profile |

### Backend APIs NOT Available (must MOCK)
| Module | What to mock |
|--------|-------------|
| Orders | create, list, get, update status (already mocked in `api-client`) |
| Inventory | stock levels, low-stock alerts |
| Payments | payment processing, payment methods |
| Delivery | assignment, tracking, status updates |
| Analytics | revenue, order counts, charts data |
| Notifications (WS) | real-time order updates |

---

## Phase 1: Ship Branding Site (1 day)

**App:** `apps/web`  
**Goal:** Production-ready, zero broken links.

| # | Task | Details |
|---|------|---------|
| 1 | Fix blog 404s | Add `generateStaticParams()` to `blog/[slug]/page.tsx` using `posts` data |
| 2 | Fix dead links | Remove `/careers` from Footer; change `/order` CTA → `https://order.bakerio.vn` or `/menu` |
| 3 | Fix title duplication | Fix `metadata.title.template` in root layout (remove double "Bakerio") |
| 4 | Unique meta descriptions | Add per-page descriptions in each `page.tsx` metadata export |
| 5 | Security headers | Add `headers()` config in `next.config.ts` (X-Frame-Options, HSTS, etc.) |

**Verification:** All 19 Playwright tests pass + manual check of blog detail pages.

---

## Phase 2: Order App — Auth + Real Data (4-5 days)

**App:** `apps/order`  
**Goal:** Functional ordering flow with real product/branch data, auth, and mocked order submission.

### 2.1 Auth (2 days)
| # | Task | API |
|---|------|-----|
| 1 | `/login` page — email + password form | REAL `api.login()` |
| 2 | `/register` page — email + password + name | REAL `api.register()` |
| 3 | `/verify` page — OTP input | REAL (backend has OTP service) |
| 4 | Auth provider (React Context) — store token in httpOnly cookie via Next.js route handler | REAL `api.setToken()` |
| 5 | Protected route wrapper — redirect unauthenticated users | Client-side check |
| 6 | Header component — show login/profile + cart badge | — |

### 2.2 Real Data (1-2 days)
| # | Task | API |
|---|------|-----|
| 1 | Branch selection page uses `api.getBranches()` | REAL |
| 2 | Menu page uses `api.getProducts()` + `api.getCategories()` | REAL |
| 3 | Product detail uses `api.getProduct(id)` | REAL |
| 4 | Cart submits via `api.createOrder()` | MOCK (already in api-client) |

### 2.3 Missing Pages (1 day)
| # | Page | Data source |
|---|------|-------------|
| 1 | `/orders` — order history | MOCK `api.getOrders()` |
| 2 | `/profile` — user info | REAL `api.getMyProfile()` |
| 3 | Bottom nav (mobile) | — |

### 2.4 Polish
- Loading skeletons (Tailwind `animate-pulse` placeholders)
- Error boundary component
- VND formatting: `new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })`
- Responsive: mobile-first, 375px–1440px

---

## Phase 3: Admin Panel (2 weeks)

**App:** `apps/admin`  
**Goal:** Internal back-office for managing products, categories, branches, staff, and viewing orders.

### 3.1 Foundation (2-3 days)
| # | Task | Notes |
|---|------|-------|
| 1 | Install shadcn/ui + Tailwind config | Use Bakerio brand colors |
| 2 | Login page | REAL `api.login()` — admin/manager roles only |
| 3 | Dashboard shell | Sidebar nav + top header + breadcrumbs |
| 4 | Auth guard | Redirect to login if no token; check role |
| 5 | Shared patterns: DataTable, Form, Toast | TanStack Table + React Hook Form + Zod |

### 3.2 CRUD Pages — Real API (1 week)
| Page | API | Priority |
|------|-----|----------|
| Products list + create/edit/delete | REAL | P0 |
| Categories list + create/edit | REAL | P0 |
| Branches list + create/edit | REAL | P0 |
| Users/Staff list + create | REAL | P0 |
| Suppliers list + create | REAL | P1 |
| Procurement orders + status transitions | REAL | P1 |

### 3.3 Mock-Dependent Pages (3-4 days)
| Page | Mock Strategy |
|------|---------------|
| Orders list + detail + status update | Use existing `api-client` mock; extend with filters/pagination |
| Dashboard stats (revenue, order count, low stock) | New mock: `packages/api-client/src/mock/analytics.ts` |
| Dashboard charts (daily revenue, orders by status) | Static mock data arrays for Recharts |
| Inventory overview | New mock: `packages/api-client/src/mock/inventory.ts` |

### 3.4 Dashboard Widgets
- Stats cards: total orders (mock), revenue (mock), active products (real count), low stock (mock)
- Charts: Recharts with mock time-series data
- Recent orders table (mock)
- Quick actions: add product, view pending POs

---

## Phase 4: Shared UI Package (parallel, ongoing)

**Package:** `packages/ui`  
**Goal:** Extract proven components from admin/order into reusable package.

Extract after they stabilize in their host app:
- Button (variants: primary, secondary, ghost, destructive)
- Input / Select / Textarea
- Card
- Badge (order status, PO status)
- Modal / Dialog
- DataTable wrapper
- Toast / Notification

---

## Mock Strategy

All mocks live in `packages/api-client/src/mock/`. This keeps the mock layer centralized and swappable.

```
packages/api-client/src/mock/
├── index.ts          ← existing (orders, products, categories, branches)
├── analytics.ts      ← NEW: dashboard stats + chart data
└── inventory.ts      ← NEW: stock levels, low-stock alerts
```

When backend ships a module, swap the import in `client.ts` from mock → real. Zero changes needed in app code.

---

## Key Decisions (for you to confirm)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Order app SSR vs CSR? | CSR for now (all client components). Menu pages don't need SEO since this is an ordering app, not the public site. |
| 2 | Admin state management? | TanStack Query for server cache + Zustand for UI state. Worth the setup for admin's data-heavy pages. |
| 3 | Auth token storage? | Next.js Route Handler sets httpOnly cookie. Client reads auth state from a `/api/me` route handler that validates the cookie server-side. |
| 4 | Image URLs? | Keep Unsplash for now. When backend has `/uploads/`, update `api-client` types to use those URLs. No app code changes needed. |
| 5 | i18n? | Defer. Ship in Vietnamese first. Add `next-intl` later as a Phase 5 task. |

---

## Execution Timeline

```
Day 1:        Phase 1 (web bugs — ship it)
Days 2-6:     Phase 2 (order app auth + real data + polish)
Days 7-9:     Phase 3.1 (admin foundation + shared patterns)
Days 10-16:   Phase 3.2 (admin CRUD pages with real API)
Days 17-20:   Phase 3.3-3.4 (admin mock pages + dashboard)
Ongoing:      Phase 4 (extract shared UI as components stabilize)
```

---

## Out of Scope (deferred)

- Real-time WebSocket notifications
- Payment integration
- CI/CD pipeline (do after Phase 2)
- Production Docker builds
