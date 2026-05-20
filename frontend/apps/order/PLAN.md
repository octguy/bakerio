# Bakerio Order Platform — Implementation Plan

> Customer-facing ordering web app for a bakery chain in HCMC, Vietnam.  
> Prices in VND. Multiple branches. Delivery + Pickup. Mobile-first responsive.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, Server Components) |
| Styling | Tailwind CSS 4 + design tokens from `@repo/ui` |
| UI Components | shadcn/ui (installed locally in this app) |
| State | React Context + localStorage (cart), cookies (JWT) |
| Data Fetching | Server Components + `@repo/api-client` |
| Real-time | Native WebSocket (order tracking) |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Formatting | VND via `Intl.NumberFormat("vi-VN")` |

---

## 1. File Structure

```
apps/order/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout: fonts, providers, metadata
│   │   ├── globals.css                   # Tailwind imports + custom tokens
│   │   ├── page.tsx                      # Landing / hero page
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                # Auth layout (centered card)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── verify/page.tsx           # OTP verification
│   │   ├── (main)/
│   │   │   ├── layout.tsx                # Main layout: header + bottom nav + cart drawer
│   │   │   ├── menu/
│   │   │   │   ├── page.tsx              # Menu browse (categories, search, branch filter)
│   │   │   │   └── [slug]/page.tsx       # Product detail
│   │   │   ├── cart/page.tsx             # Full cart page (mobile fallback)
│   │   │   ├── checkout/page.tsx         # Checkout: address + payment + confirm
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx              # Order history list
│   │   │   │   └── [id]/page.tsx         # Order detail + real-time tracking
│   │   │   └── profile/page.tsx          # User profile + settings
│   │   └── api/
│   │       └── ws/route.ts               # (Optional) WebSocket proxy for dev
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx                # Top nav: logo, search, auth, cart badge
│   │   │   ├── BottomNav.tsx             # Mobile bottom navigation bar
│   │   │   ├── Footer.tsx                # Desktop footer
│   │   │   └── CartDrawer.tsx            # Slide-over cart panel (desktop)
│   │   ├── product/
│   │   │   ├── ProductCard.tsx           # Grid card: image, name, price, add-to-cart
│   │   │   ├── ProductGrid.tsx           # Responsive grid wrapper
│   │   │   ├── ProductDetail.tsx         # Full product view with gallery
│   │   │   ├── CategoryTabs.tsx          # Horizontal scrollable category filter
│   │   │   └── SearchBar.tsx             # Search input with debounce
│   │   ├── cart/
│   │   │   ├── CartItem.tsx              # Line item: image, name, qty, price, remove
│   │   │   ├── CartSummary.tsx           # Subtotal, delivery fee, total
│   │   │   └── QuantitySelector.tsx      # +/- stepper with min=1
│   │   ├── checkout/
│   │   │   ├── CheckoutForm.tsx          # Orchestrates address + payment + submit
│   │   │   ├── AddressForm.tsx           # Delivery address fields
│   │   │   ├── PaymentMethodSelector.tsx # VNPay / Momo / COD radio cards
│   │   │   └── OrderTypeSelector.tsx     # Delivery vs Pickup toggle
│   │   ├── order/
│   │   │   ├── OrderCard.tsx             # Order summary card for history list
│   │   │   ├── OrderTracker.tsx          # Real-time status stepper (WebSocket)
│   │   │   └── OrderStatusBadge.tsx      # Colored badge per status
│   │   ├── branch/
│   │   │   └── BranchSelector.tsx        # Branch picker dropdown/modal
│   │   └── ui/                           # shadcn/ui components (auto-generated)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       ├── sheet.tsx
│   │       ├── badge.tsx
│   │       ├── card.tsx
│   │       ├── tabs.tsx
│   │       ├── radio-group.tsx
│   │       ├── select.tsx
│   │       ├── skeleton.tsx
│   │       ├── toast.tsx
│   │       └── separator.tsx
│   ├── providers/
│   │   ├── CartProvider.tsx              # Cart context + localStorage persistence
│   │   ├── AuthProvider.tsx              # Auth context: user, token, login/logout
│   │   ├── BranchProvider.tsx            # Selected branch context
│   │   └── Providers.tsx                 # Compose all providers
│   ├── hooks/
│   │   ├── useCart.ts                    # Cart context consumer hook
│   │   ├── useAuth.ts                    # Auth context consumer hook
│   │   ├── useBranch.ts                  # Branch context consumer hook
│   │   ├── useWebSocket.ts              # WebSocket connection hook for order tracking
│   │   └── useDebounce.ts               # Debounce hook for search
│   ├── lib/
│   │   ├── format.ts                    # formatVND(), formatDate()
│   │   ├── constants.ts                 # Order statuses, delivery fee, etc.
│   │   ├── websocket.ts                 # WebSocket client class
│   │   └── cn.ts                        # clsx + tailwind-merge utility
│   └── types/
│       └── index.ts                     # Re-export from @repo/api-client + local types
├── public/
│   ├── logo.svg
│   ├── hero-bg.jpg
│   └── icons/                           # PWA icons
├── next.config.ts
├── tailwind.config.ts                   # Extend with @repo/ui tokens
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```

---

## 2. Pages & Routes

| Route | Page | Auth | Description |
|-------|------|------|-------------|
| `/` | Landing | No | Hero, featured products, CTA |
| `/login` | Login | No | Email + password form |
| `/register` | Register | No | Name + email + password |
| `/verify` | Verify Email | No | 6-digit OTP input |
| `/menu` | Menu Browse | No | Products grid + category tabs + search + branch filter |
| `/menu/[slug]` | Product Detail | No | Full product info, add to cart |
| `/cart` | Cart (mobile) | No | Full-page cart for mobile |
| `/checkout` | Checkout | Yes | Address, payment, order summary, place order |
| `/orders` | Order History | Yes | List of past orders |
| `/orders/[id]` | Order Tracking | Yes | Real-time status via WebSocket |
| `/profile` | Profile | Yes | Edit name, view email, logout |

---

## 3. State Management

### 3.1 Cart (Context + localStorage)

```typescript
interface CartState {
  items: CartItem[];          // { product, quantity }
  branchId: string | null;    // Selected branch for pricing/availability
}

interface CartActions {
  addItem(product: Product, qty?: number): void;
  removeItem(productId: string): void;
  updateQuantity(productId: string, qty: number): void;
  clearCart(): void;
  setBranch(branchId: string): void;
}
```

- Persisted to `localStorage` key `bakerio_cart`
- Hydrated on mount (client-only) to avoid SSR mismatch
- Cart count shown in header badge

### 3.2 Auth (Context + cookie)

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthActions {
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, fullName: string): Promise<void>;
  logout(): void;
}
```

- JWT stored in `httpOnly` cookie (via Next.js middleware) or localStorage for mock
- Token passed to `@repo/api-client` via `setToken()`
- Protected routes redirect to `/login` if no token

### 3.3 Branch (Context)

```typescript
interface BranchState {
  selectedBranch: Branch | null;
  branches: Branch[];
}
```

- Fetched on app load
- Persisted to localStorage
- Required before checkout

---

## 4. Components Detail

### ProductCard
- Image (Next.js `<Image>` with blur placeholder)
- Product name (1 line, truncate)
- Price formatted as VND (e.g., "185.000₫")
- "Thêm" (Add) button → adds 1 to cart
- Category badge (optional)

### CartDrawer
- Sheet component (slides from right on desktop)
- List of CartItems
- CartSummary at bottom
- "Đặt hàng" (Checkout) CTA button
- Empty state illustration

### QuantitySelector
- Minus button (disabled at 1)
- Number display
- Plus button
- Compact size for cart items

### CheckoutForm
- Step 1: OrderTypeSelector (Delivery / Pickup)
- Step 2: AddressForm (if delivery) or BranchSelector (if pickup)
- Step 3: PaymentMethodSelector
- Step 4: Order summary + "Xác nhận đặt hàng" button

### OrderTracker
- Vertical stepper showing order lifecycle
- Current step highlighted with animation
- WebSocket updates move the stepper in real-time
- Statuses: Đang xử lý → Đang chuẩn bị → Sẵn sàng → Đang giao → Hoàn thành

### BranchSelector
- Dropdown on desktop, bottom sheet on mobile
- Shows branch name + address
- Optional: distance from user (if geolocation available)

---

## 5. Real-time: WebSocket Order Tracking

```typescript
// lib/websocket.ts
class OrderWebSocket {
  private ws: WebSocket | null = null;
  private orderId: string;
  private onStatusChange: (status: OrderStatus) => void;

  connect(orderId: string, token: string) {
    const url = `${WS_BASE}/ws/orders/${orderId}?token=${token}`;
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "status_update") {
        this.onStatusChange(data.status);
      }
    };
  }

  disconnect() { this.ws?.close(); }
}
```

- Hook `useWebSocket(orderId)` manages connection lifecycle
- Auto-reconnect with exponential backoff
- Falls back to polling (every 5s) if WebSocket unavailable
- Mock: simulates status progression every 10s for demo

---

## 6. Payment Flow (Mock)

```
User selects payment method →
  COD: Order placed immediately (status: CONFIRMED)
  VNPay/Momo: Redirect to mock payment page →
    Mock page shows "Processing..." for 2s →
    Redirects back to /orders/[id] with ?payment=success →
    Order status updated to PAID
```

Implementation:
- `/checkout` creates order with status `PENDING_PAYMENT`
- For VNPay/Momo: redirect to `/api/payment/mock?orderId=X&method=vnpay`
- Mock API route waits 2s, updates order status, redirects to order page
- COD skips payment, goes directly to CONFIRMED

---

## 7. Responsive Design

### Breakpoints
- Mobile: < 768px (default, mobile-first)
- Tablet: 768px – 1024px
- Desktop: > 1024px

### Mobile-specific
- Bottom navigation bar (Home, Menu, Cart, Orders, Profile)
- Cart as full page (`/cart`) instead of drawer
- Product grid: 2 columns
- Sticky "Add to Cart" bar on product detail
- Touch-friendly tap targets (min 44px)

### Desktop-specific
- Top header with search bar
- Cart as slide-over drawer (Sheet)
- Product grid: 3-4 columns
- Sidebar category filter
- Footer with links

### Shared
- All images use `next/image` with responsive sizes
- Skeleton loading states for all data-fetching pages
- Toast notifications for cart actions

---

## 8. Implementation Order

### Phase 1: Foundation (Day 1-2)
1. Install dependencies: `shadcn/ui`, `react-hook-form`, `zod`, `lucide-react`, `clsx`, `tailwind-merge`
2. Configure `tailwind.config.ts` with `@repo/ui` tokens
3. Set up shadcn/ui components (button, input, card, sheet, badge, tabs, skeleton, toast)
4. Create `lib/format.ts`, `lib/cn.ts`, `lib/constants.ts`
5. Create `providers/` (CartProvider, AuthProvider, BranchProvider, Providers)
6. Create `hooks/` (useCart, useAuth, useBranch, useDebounce)
7. Create root `layout.tsx` with Providers wrapper
8. Create `(main)/layout.tsx` with Header + BottomNav

### Phase 2: Menu & Products (Day 3-4)
9. Build `CategoryTabs` component
10. Build `SearchBar` component
11. Build `ProductCard` component
12. Build `ProductGrid` component
13. Build `BranchSelector` component
14. Implement `/menu` page (fetch products + categories from API)
15. Build `ProductDetail` component
16. Implement `/menu/[slug]` page

### Phase 3: Cart (Day 4-5)
17. Build `QuantitySelector` component
18. Build `CartItem` component
19. Build `CartSummary` component
20. Build `CartDrawer` component (Sheet-based)
21. Implement `/cart` page (mobile full-page cart)
22. Add cart badge to Header
23. Add "Add to Cart" interactions on ProductCard and ProductDetail

### Phase 4: Auth (Day 5-6)
24. Build `(auth)/layout.tsx`
25. Implement `/login` page with form validation
26. Implement `/register` page
27. Implement `/verify` page (OTP input)
28. Add auth middleware (redirect unauthenticated users from protected routes)
29. Implement `/profile` page

### Phase 5: Checkout (Day 6-7)
30. Build `OrderTypeSelector` component
31. Build `AddressForm` component
32. Build `PaymentMethodSelector` component
33. Build `CheckoutForm` orchestrator
34. Implement `/checkout` page
35. Implement mock payment redirect flow

### Phase 6: Orders & Tracking (Day 7-8)
36. Build `OrderStatusBadge` component
37. Build `OrderCard` component
38. Implement `/orders` page (order history)
39. Build `OrderTracker` component (stepper)
40. Implement `lib/websocket.ts` + `useWebSocket` hook
41. Implement `/orders/[id]` page with real-time tracking
42. Add mock WebSocket simulation (status auto-progression)

### Phase 7: Landing & Polish (Day 8-9)
43. Implement `/` landing page (hero, featured products, branch info)
44. Add loading skeletons to all pages
45. Add error boundaries and empty states
46. Add toast notifications for cart/order actions
47. Responsive QA pass (mobile, tablet, desktop)
48. Add PWA manifest + meta tags
49. Performance optimization (image sizes, lazy loading, prefetch)

---

## 9. Key Dependencies to Add

```json
{
  "dependencies": {
    "@repo/api-client": "workspace:*",
    "@repo/ui": "workspace:*",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.24.0",
    "lucide-react": "^0.468.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

---

## 10. Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_APP_NAME=Bakerio
```

---

## 11. Vietnamese UI Copy

| Key | Vietnamese |
|-----|-----------|
| Add to cart | Thêm vào giỏ |
| Cart | Giỏ hàng |
| Checkout | Thanh toán |
| Place order | Đặt hàng |
| Delivery | Giao hàng |
| Pickup | Nhận tại cửa hàng |
| Order history | Lịch sử đơn hàng |
| Search | Tìm kiếm... |
| Login | Đăng nhập |
| Register | Đăng ký |
| Profile | Tài khoản |
| Total | Tổng cộng |
| Delivery fee | Phí giao hàng |
| Payment method | Phương thức thanh toán |
| Cash on delivery | Thanh toán khi nhận hàng |
| Address | Địa chỉ giao hàng |
| Note | Ghi chú |
| All categories | Tất cả |

---

## 12. Order Status Flow

```
PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
                                                        └→ (pickup) READY → COMPLETED
         └→ CANCELLED (at any point before PREPARING)
```

---

## 13. Delivery Fee Logic (Mock)

- Base fee: 25.000₫
- Free delivery for orders > 300.000₫
- Pickup: 0₫

---

## 14. Performance Targets

- LCP < 2.5s on 4G mobile
- FID < 100ms
- CLS < 0.1
- Bundle size: < 150KB first load JS
- Images: WebP with responsive srcset via `next/image`


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

