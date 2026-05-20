# Frontend Development Plan (Revised Scope)

> **Date:** 2026-05-19
> **Scope:** Branding site + Customer ordering + Admin panel ONLY
> **Dropped:** POS, Driver, Mobile apps

---

## Revised App Matrix

| App | Purpose | Status | Priority |
|-----|---------|--------|----------|
| `apps/web` | Branding site (public) | 90% done, 3 bugs | P0 — fix & ship |
| `apps/order` | Customer online ordering | 40% done, mock data | P1 — wire to API |
| `apps/admin` | Internal order processing + back office | Scaffold only | P2 — build out |

---

## Round 1: Implementation

### Track A — Fix Branding Site (apps/web)
1. Fix blog `[slug]` 404 — add `generateStaticParams()`
2. Remove dead links (`/careers`, `/order` → point to correct targets)
3. Fix duplicate "Bakerio" in page titles
4. Add unique meta descriptions per page
5. Add security headers in `next.config.ts`

### Track B — Order App Real Data (apps/order)
1. Auth pages (login, register, verify OTP)
2. Auth context/provider with JWT cookie
3. Replace mock branches/products with real API calls
4. Header with auth state + cart badge
5. Loading states + error handling

### Track C — Admin Panel Foundation (apps/admin)
1. Install shadcn/ui with Bakerio design tokens
2. Login page + auth guard
3. Dashboard layout (sidebar + header)
4. Products CRUD page (list + create/edit)
5. Categories CRUD page
6. Branches list page
7. Users/Staff management page

---

## Round 2: Audit

After implementation, audit for:
- Broken links / dead routes
- Accessibility (alt tags, ARIA, keyboard nav)
- SEO (meta tags, structured data, performance)
- Security (headers, XSS vectors, auth flows)
- Code quality (unused imports, type safety, error handling)
- E2E test coverage gaps
