# Bakerio Admin Panel — Implementation Plan

> Internal back-office dashboard for Bakerio bakery chain HQ and store managers.
> Vietnamese bakery with 10 branches in HCMC.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State:** React Query (TanStack Query) for server state, Zustand for client state
- **API:** `@repo/api-client` (real endpoints for products, categories, branches, suppliers, procurement, users, auth; mock for orders)
- **Charts:** Recharts
- **Tables:** TanStack Table (via shadcn DataTable)
- **Forms:** React Hook Form + Zod
- **Real-time:** Native WebSocket
- **Icons:** Lucide React

---

## 1. File Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    # Sidebar + Header + Breadcrumbs
│   │   │   ├── page.tsx                      # Dashboard (stats, charts, alerts)
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx                  # Order list + kanban toggle
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx              # Order detail + actions
│   │   │   ├── products/
│   │   │   │   ├── page.tsx                  # Product list (DataTable)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx              # Create product form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx              # Edit product (form + images + pricing)
│   │   │   ├── categories/
│   │   │   │   └── page.tsx                  # Category CRUD (inline table)
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx                  # Stock levels table + alerts
│   │   │   │   └── adjustments/
│   │   │   │       └── page.tsx              # Stock adjustment history
│   │   │   ├── procurement/
│   │   │   │   ├── page.tsx                  # PO list (DataTable + status filter)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx              # Create PO form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx              # PO detail + status transitions
│   │   │   ├── suppliers/
│   │   │   │   └── page.tsx                  # Supplier CRUD
│   │   │   ├── branches/
│   │   │   │   ├── page.tsx                  # Branch list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx              # Branch detail/edit
│   │   │   ├── users/
│   │   │   │   ├── page.tsx                  # Staff list
│   │   │   │   └── new/
│   │   │   │       └── page.tsx              # Create staff form
│   │   │   └── settings/
│   │   │       └── page.tsx                  # App settings / profile
│   │   ├── layout.tsx                        # Root layout (providers)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                               # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── command.tsx
│   │   │   ├── popover.tsx
│   │   │   └── form.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                   # Collapsible sidebar nav
│   │   │   ├── header.tsx                    # Top bar: breadcrumbs + user menu + notifications
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── user-menu.tsx
│   │   ├── data-table/
│   │   │   ├── data-table.tsx                # Generic DataTable wrapper
│   │   │   ├── data-table-pagination.tsx
│   │   │   ├── data-table-toolbar.tsx        # Search + filters + column toggle
│   │   │   ├── data-table-faceted-filter.tsx
│   │   │   └── data-table-column-header.tsx  # Sortable header
│   │   ├── dashboard/
│   │   │   ├── stat-card.tsx                 # KPI card (icon, value, trend)
│   │   │   ├── revenue-chart.tsx             # Line/area chart
│   │   │   ├── orders-chart.tsx              # Bar chart by status
│   │   │   ├── top-products.tsx              # Mini table
│   │   │   └── recent-orders.tsx             # Activity feed
│   │   ├── orders/
│   │   │   ├── order-kanban.tsx              # Drag-and-drop kanban board
│   │   │   ├── order-card.tsx                # Card in kanban column
│   │   │   ├── order-status-badge.tsx
│   │   │   ├── order-actions.tsx             # Status transition buttons
│   │   │   └── order-timeline.tsx            # Status history
│   │   ├── products/
│   │   │   ├── product-form.tsx              # Create/edit form
│   │   │   ├── image-uploader.tsx            # Drag-drop multi-image upload
│   │   │   ├── price-manager.tsx             # Branch-specific pricing
│   │   │   └── product-columns.tsx           # DataTable column defs
│   │   ├── inventory/
│   │   │   ├── stock-alert.tsx               # Low stock warning card
│   │   │   ├── stock-level-bar.tsx           # Visual stock indicator
│   │   │   └── adjustment-form.tsx           # Stock adjustment dialog
│   │   ├── procurement/
│   │   │   ├── po-form.tsx                   # Create PO with line items
│   │   │   ├── po-status-badge.tsx
│   │   │   ├── po-status-actions.tsx         # Approve/reject/receive buttons
│   │   │   └── po-columns.tsx
│   │   ├── branches/
│   │   │   ├── branch-form.tsx
│   │   │   ├── branch-status-toggle.tsx
│   │   │   └── branch-picker.tsx             # Combobox for branch selection
│   │   ├── users/
│   │   │   ├── user-form.tsx                 # Create staff form
│   │   │   ├── role-selector.tsx             # Role dropdown with descriptions
│   │   │   └── user-columns.tsx
│   │   └── shared/
│   │       ├── confirm-dialog.tsx            # Reusable "Are you sure?" dialog
│   │       ├── status-badge.tsx              # Generic colored badge
│   │       ├── empty-state.tsx               # No data placeholder
│   │       ├── loading-skeleton.tsx          # Page-level skeleton
│   │       ├── page-header.tsx               # Title + description + action button
│   │       └── notification-bell.tsx         # Real-time notification indicator
│   ├── hooks/
│   │   ├── use-auth.ts                       # Auth state + token management
│   │   ├── use-permissions.ts                # Role/permission checks
│   │   ├── use-websocket.ts                  # WebSocket connection + reconnect
│   │   └── use-debounce.ts
│   ├── lib/
│   │   ├── auth.ts                           # Token storage, decode JWT, check expiry
│   │   ├── permissions.ts                    # Permission constants + helpers
│   │   ├── utils.ts                          # cn(), formatCurrency(), formatDate()
│   │   └── websocket.ts                      # WS client singleton
│   ├── providers/
│   │   ├── query-provider.tsx                # TanStack Query provider
│   │   ├── auth-provider.tsx                 # Auth context + route guard
│   │   └── notification-provider.tsx         # WebSocket notification context
│   └── stores/
│       ├── auth-store.ts                     # Zustand: user, token, roles
│       └── notification-store.ts             # Zustand: unread notifications
├── public/
│   └── logo.svg
├── package.json
├── next.config.ts
├── tailwind.config.ts                        # (if needed beyond CSS-first)
├── postcss.config.mjs
└── tsconfig.json
```

---

## 2. Pages Detail

### 2.1 Login (`/login`)
- Email + password form
- Calls `login()` from `@repo/api-client`
- Stores JWT in cookie (httpOnly via middleware) + Zustand
- Redirects to `/` on success
- Shows error toast on failure

### 2.2 Dashboard (`/`)
- **StatCards:** Today's revenue, orders count, pending orders, low stock items
- **Revenue Chart:** 7-day line chart (mock data initially)
- **Orders by Status:** Stacked bar chart
- **Top Products:** Mini table (top 5 by sales)
- **Recent Orders:** Live feed (WebSocket updates)
- **Alerts:** Low stock items, pending PO approvals

### 2.3 Orders (`/orders`)
- **List view:** DataTable with columns: ID, customer, branch, status, total, date
- **Kanban view:** Toggle between list/kanban; columns = order statuses
- **Filters:** Status, branch, date range
- **Actions:** Click row → detail page

### 2.4 Order Detail (`/orders/[id]`)
- Order summary card
- Items table
- Status timeline
- Action buttons: Confirm → Preparing → Ready → Delivered (role-dependent)
- Cancel with reason dialog

### 2.5 Products (`/products`)
- DataTable: SKU, name, category, price, status, actions
- Search by name/SKU
- Filter by category, active status
- Bulk actions: activate/deactivate
- "New Product" button → `/products/new`

### 2.6 Product Create/Edit (`/products/new`, `/products/[id]`)
- Form fields: SKU, name, description, category (select), unit, base price
- Image uploader: drag-drop, reorder, set primary
- Branch pricing: table of branch-specific price overrides
- Save/cancel buttons

### 2.7 Categories (`/categories`)
- Inline editable table (no separate pages)
- Columns: name, slug, parent, sort order, active
- Add row button
- Edit/delete inline
- Drag to reorder

### 2.8 Inventory (`/inventory`)
- DataTable: product, branch, current stock, min threshold, status
- Color-coded stock levels (green/yellow/red)
- Stock alerts panel (items below threshold)
- "Adjust Stock" button → dialog with quantity +/- and reason
- **Note:** Backend not yet implemented — use mock data

### 2.9 Procurement (`/procurement`)
- DataTable: PO code, supplier, branch, status, total, date
- Status filter tabs: DRAFT, PENDING, APPROVED, RECEIVED, REJECTED
- "New PO" button → `/procurement/new`

### 2.10 Create PO (`/procurement/new`)
- Select supplier (from real API)
- Select branch (auto from user context for store_manager)
- Add line items: product search + quantity + unit price
- Auto-calculate totals
- Note field
- Submit as DRAFT

### 2.11 PO Detail (`/procurement/[id]`)
- PO header info
- Items table
- Status badge + transition buttons:
  - DRAFT → PENDING (submitter)
  - PENDING → APPROVED/REJECTED (approver)
  - APPROVED → RECEIVED (receiver)
- Optimistic concurrency via version field

### 2.12 Suppliers (`/suppliers`)
- DataTable: name, region, contact, active
- CRUD via dialog forms
- Filter by region

### 2.13 Branches (`/branches`)
- DataTable: name, address, region, status
- "New Branch" button → dialog
- Edit → `/branches/[id]`
- Status toggle (active/inactive)

### 2.14 Branch Detail (`/branches/[id]`)
- Edit form: name, address, lat/lng, region
- Status toggle
- Staff assigned to this branch (read-only list)

### 2.15 Users/Staff (`/users`)
- DataTable: name, email, role, branch, created
- "Create Staff" button → `/users/new`
- Actions: set password, change branch

### 2.16 Create Staff (`/users/new`)
- Form: email, full name, password, role (selector), branch (picker)
- Role determines if branch is required
- Validates caller permissions (frontend check + backend enforces)

### 2.17 Settings (`/settings`)
- Profile: display name, avatar, bio
- Change password form
- (Future: notification preferences, theme)

---

## 3. Component Specifications

### 3.1 DataTable
- Built on TanStack Table + shadcn Table
- Features: sorting, filtering, pagination, column visibility toggle
- Reusable across all list pages
- Server-side pagination ready (currently client-side)

### 3.2 StatCard
- Props: `title`, `value`, `icon`, `trend` (up/down %), `description`
- Uses shadcn Card

### 3.3 Charts (Revenue, Orders)
- Recharts `<AreaChart>` for revenue
- Recharts `<BarChart>` for orders by status
- Responsive, themed with Tailwind colors

### 3.4 OrderKanban
- Columns: PENDING_PAYMENT → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY
- Cards show: order ID, items count, total, time elapsed
- Click card → navigate to detail
- (Drag-and-drop optional Phase 2)

### 3.5 ImageUploader
- Drag-and-drop zone
- Preview thumbnails with delete button
- Star icon to set primary
- Calls product image upload endpoint
- Max 5 images, max 2MB each

### 3.6 RoleSelector
- Dropdown with role options based on caller permissions
- `super_admin` sees: store_manager, staff_cashier, baker, shipper
- `store_manager` sees: staff_cashier, baker, shipper

### 3.7 BranchPicker
- Combobox (shadcn Command + Popover)
- Searchable branch list
- Shows branch name + region
- Auto-selected for store_manager (their own branch)

### 3.8 StatusBadge
- Props: `status`, `variant` (maps status → color)
- Reused for orders, POs, branches, users

### 3.9 ConfirmDialog
- Props: `title`, `description`, `onConfirm`, `destructive?`
- Uses shadcn AlertDialog
- Used for: delete product, cancel order, reject PO

---

## 4. Auth & Permissions

### 4.1 Auth Flow
1. User visits any `(dashboard)` route
2. `auth-provider.tsx` checks for valid JWT in cookie/localStorage
3. If missing/expired → redirect to `/login`
4. On login success → decode JWT → extract `user_id`, `roles`, `branch_id`
5. Store in Zustand + cookie

### 4.2 Role-Based Access
| Role | Sees |
|------|------|
| `super_admin` | Everything, all branches |
| `store_manager` | Own branch data only |
| `staff_cashier` | Orders (own branch) |
| `baker` | Orders (preparing status) |

### 4.3 Permission Checks
- **Frontend:** `usePermissions()` hook hides UI elements
- **Backend:** Enforces via middleware (frontend is cosmetic only)
- Sidebar items conditionally rendered based on role
- Action buttons hidden if user lacks permission

### 4.4 Route Protection
- `(dashboard)/layout.tsx` wraps children with `<AuthProvider>`
- AuthProvider redirects to `/login` if unauthenticated
- Per-page permission checks via `usePermissions().require("product:manage:all")`

---

## 5. Real-Time (WebSocket)

### 5.1 Connection
- Connect to `ws://localhost:8080/ws` on dashboard mount
- Auto-reconnect with exponential backoff
- Send JWT as query param or first message for auth

### 5.2 Events
- `order.new` → Toast notification + increment badge
- `order.status_changed` → Update kanban/list in real-time
- `procurement.status_changed` → Update PO list

### 5.3 Implementation
- `use-websocket.ts` hook manages connection lifecycle
- `notification-provider.tsx` distributes events to subscribers
- `notification-store.ts` tracks unread count
- Bell icon in header shows unread count badge

---

## 6. Dependencies to Add

```json
{
  "@repo/api-client": "workspace:*",
  "@repo/ui": "workspace:*",
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-table": "^8.0.0",
  "zustand": "^5.0.0",
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.23.0",
  "recharts": "^2.12.0",
  "lucide-react": "^0.400.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.3.0",
  "date-fns": "^3.6.0",
  "sonner": "^1.5.0"
}
```

---

## 7. Implementation Order

### Phase 1: Foundation (Days 1–2)
1. Install dependencies, configure `package.json`
2. Set up Tailwind CSS + shadcn/ui (init + add base components)
3. Create `lib/utils.ts` (cn helper)
4. Create root layout with providers (QueryProvider, AuthProvider)
5. Implement auth store + `use-auth` hook
6. Build login page
7. Build dashboard layout: sidebar, header, breadcrumbs
8. Route protection in `(dashboard)/layout.tsx`

### Phase 2: Core CRUD Pages (Days 3–5)
9. Build DataTable component (generic, reusable)
10. Products page (list + create + edit)
11. Categories page (inline CRUD)
12. Branches page (list + detail/edit)
13. Suppliers page (list + CRUD dialogs)
14. Image uploader component

### Phase 3: Procurement & Users (Days 6–7)
15. Procurement list page
16. Create PO page (multi-line item form)
17. PO detail page (status transitions)
18. Users/Staff list page
19. Create staff page (role selector + branch picker)
20. Settings/profile page

### Phase 4: Orders & Dashboard (Days 8–9)
21. Dashboard page (stat cards + charts with mock data)
22. Orders list page (DataTable)
23. Order detail page (timeline + actions)
24. Order kanban view
25. Status badge + action components

### Phase 5: Real-Time & Polish (Days 10–11)
26. WebSocket hook + notification provider
27. Notification bell in header
28. Real-time order updates on dashboard
29. Inventory page (mock data, stock alerts)
30. Confirm dialogs for destructive actions
31. Loading skeletons + empty states
32. Error boundaries + toast notifications
33. Responsive sidebar (mobile sheet)

### Phase 6: Permissions & Testing (Day 12)
34. Permission-based UI hiding
35. Branch-scoped data filtering for store_manager
36. Manual QA pass on all flows
37. Fix edge cases (expired token, network errors, optimistic updates)

---

## 8. Key Design Decisions

1. **App Router only** — no Pages Router. All routes use `(group)` folders for layout separation.
2. **Server Components by default** — client components only where interactivity is needed (forms, tables, charts).
3. **React Query for all API calls** — provides caching, refetching, optimistic updates.
4. **shadcn/ui copy-paste model** — components live in `src/components/ui/`, fully customizable.
5. **Branch scoping** — store_manager users see only their branch data. The API enforces this, but the frontend also filters the UI to avoid confusion.
6. **Mock-first for unimplemented backends** — Orders and Inventory use mock data from `@repo/api-client`. When backend implements these, just swap the import.
7. **Vietnamese locale** — dates formatted with Vietnamese locale, currency in VND (₫).


---

## Design Language Conformance

> All apps MUST conform to the Bakerio design system defined in `/.internal_docs/pizza4ps-crawl/`.

### Colors (from `05-bakerio-colors.md`)
```
Backgrounds:  cream #FDF8F3, vanilla #FAF3EB, butter #F5EBD9, crust #EDE0CC
Text:         espresso #2C1810, cocoa #4A3228, caramel #7A5C3E
Accents:      golden #D4943A, honey #E8A94E, cinnamon #B5722A
Feedback:     sage #6B8F5E (success), sienna #C45B4A (error), rose #C97B6B (special)
```

### Typography (from `06-design-guidelines.md`)
```
Script (brand accents): Sacramento cursive
Headings:               Lora serif, 600-700 weight
Body:                   Inter sans-serif, 400-500 weight
```

### Component Patterns (from `03-design-system.md`)
- Buttons: golden bg, white text, 8px radius, cinnamon hover
- Cards: white bg, 1px crust border, 10px radius, soft shadow, hover lift
- Inputs: white bg, crust border, 6px radius, golden focus ring
- Badges: butter bg + cinnamon text, or accent/10 bg + accent text
- Shadows: soft (1px), card (4px), elevated (8px) — all rgba(44,24,16,x)

### Animations (from `04-animations.md`)
- Micro interactions: 150-200ms ease (hover, focus)
- UI transitions: 200-300ms ease-out (modals, drawers)
- Scroll reveals: GSAP, 600-800ms power2.out (branding site only)
- Card hover: translateY(-2px) + shadow elevation

### Shared via `@repo/ui`
All apps import tokens from `@repo/ui/tokens` — do NOT hardcode hex values.
Use CSS variables from `globals.css` (--primary = golden, --background = cream, etc.)

### App-Specific Notes
- **order**: Warm cream background, golden CTAs, product cards with hover lift
- **admin**: Cream sidebar, vanilla content area, golden active states, data tables with crust borders

