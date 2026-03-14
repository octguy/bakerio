# Bakerio — UI Flows & Wireframes

> Version 1.0 | 2026-03-03
> All wireframes are text-based ASCII layouts. Final visual design uses Tailwind CSS, mobile-first.

---

## Design Principles

1. **Mobile-first** — primary customer experience is on phone
2. **Large tap targets** — minimum 44×44px for all interactive elements
3. **Progressive disclosure** — show only what the user needs at each step
4. **Live price feedback** — total updates instantly as options change
5. **Clear status communication** — orders always have a visible, human-readable status
6. **Image-first option picking** — decoration options show thumbnails, not just text

---

## Color Palette

| Role | Color | Usage | Contrast on bg | WCAG AA |
|---|---|---|---|---|
| Primary | Warm Brown `#6B3F1A` | Buttons, active states, headings | 7.2:1 on Cream | ✅ Pass |
| Accent | Golden `#E8A020` | Stars, decorative highlights only | 2.8:1 on White | ❌ Fail — do NOT use for text or price labels |
| Accent (text safe) | Dark Amber `#92610A` | Price labels, CTA text | 4.6:1 on White | ✅ Pass |
| Background | Cream `#FDF6EC` | Page backgrounds | — | — |
| Surface | White `#FFFFFF` | Cards | — | — |
| Text | Dark `#1A1A1A` | Body text | 19.1:1 on White | ✅ Pass |
| Muted | Gray `#6B7280` | Subtitles, timestamps | 4.6:1 on White | ✅ Pass |
| Success | Green `#16A34A` | Delivered, confirmed | 4.5:1 on White | ✅ Pass |
| Warning | Amber `#D97706` | Pending, preparing (icon only, not text) | 3.0:1 on White | ❌ — use icon + label, not color alone |
| Error | Red `#DC2626` | Cancelled, failed | 4.6:1 on White | ✅ Pass |

> **Fix applied from review:** Original Golden `#E8A020` on White fails WCAG AA (2.8:1). All price label text must use Dark Amber `#92610A`. Golden may only be used for decorative elements (star icons, borders) where text contrast is not required.

---

## 0. App Navigation Map

### Customer App
```
[Home — Branch List]
    │
    ▼
[Branch Catalog] ──────────────────────────────┐
    │                                           │
    ├── [Product Detail / Option Picker]        │
    │       │                                   │
    │       └── [Cart]  ◄───────────────────────┘
    │               │
    │               └── [Checkout]
    │                       │
    │                       └── [Order Confirmation]
    │                                   │
    │                                   └── [Order Tracking]  (polls every 30s)
    │                                               │
    │                                               └── [Review Prompt]  (on DELIVERED)
    │
    ├── [Custom Cake Builder]  (wizard, 7 steps)
    │       │
    │       └── [Custom Order Summary] ──► [Cart] (as a custom line item)
    │
    ├── [Order History]
    │       └── [Order Detail]
    │               └── [Reorder]
    │
    └── [Profile / Settings]
```

**Back button behavior in Custom Builder:** Preserves selections for all completed steps. Navigating back does not reset the wizard — user can change a previous step and continue.

### Staff App
```
[Login]
    │
    └── [Staff Dashboard]
            ├── [Order Queue Tab]  (default)
            │       └── [Order Detail]
            │               └── [Confirm / Reject / Advance Status]
            ├── [Custom Orders Tab]
            │       └── [Custom Order Detail]
            │               └── [Confirm / Reject]
            └── [Product Manager Tab]
                    ├── [Product List]
                    ├── [Product Edit]
                    └── [Option Group Editor]
```

### Delivery App
```
[Login]
    │
    └── [Delivery Dashboard]
            ├── [Pickup Pool]  (available orders)
            │       └── [Accept / Decline]
            └── [Active Delivery]
                    └── [Status Updater: Picked Up → Out for Delivery → Delivered]
```

### Admin App
```
[Login]
    │
    └── [Admin Dashboard]  (reports overview)
            ├── [Branch Manager]  (CRUD)
            ├── [Staff Manager]  (create / deactivate)
            ├── [Voucher Manager]  (CRUD + usage stats)
            └── [Reports]  (date range filter, per-branch drill-down)
```

---

## 1. Customer Flows

### 1.1 Branch Selection (Home Screen)

```
┌────────────────────────────────┐
│  🍰 Bakerio           [Login]  │
├────────────────────────────────┤
│  📍 Your nearest branches      │
│                                │
│  ┌──────────────────────────┐  │
│  │ 🏪 Bakerio District 1    │  │
│  │ 12 Nguyen Hue            │  │
│  │ ⏰ Open until 22:00      │  │
│  │ ★ 4.8  •  Mon–Sun        │  │
│  │           [Order Now →]  │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ 🏪 Bakerio District 3    │  │
│  │ 99 Vo Van Tan            │  │
│  │ ⏰ Open until 21:00      │  │
│  │ ★ 4.6  •  Mon–Sun        │  │
│  │           [Order Now →]  │  │
│  └──────────────────────────┘  │
│                                │
└────────────────────────────────┘
```

---

### 1.2 Product Catalog

```
┌────────────────────────────────┐
│ ← Bakerio D1      🛒 Cart (2) │
├────────────────────────────────┤
│ [All] [Cakes] [Cookies] [Custom│
├────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐   │
│  │ [Image]  │  │ [Image]  │   │
│  │          │  │          │   │
│  │ Choc Cake│  │ Vanilla  │   │
│  │ 250,000₫ │  │ 230,000₫ │   │
│  │ ★ 4.7    │  │ ★ 4.5    │   │
│  │ [Add +]  │  │ [Add +]  │   │
│  └──────────┘  └──────────┘   │
│                                │
│  ┌──────────┐  ┌──────────┐   │
│  │ [Image]  │  │ [Image]  │   │
│  │          │  │          │   │
│  │✨ Custom │  │ Macaron  │   │
│  │ from 300k│  │ 180,000₫ │   │
│  │ [Design] │  │ [Add +]  │   │
│  └──────────┘  └──────────┘   │
└────────────────────────────────┘
```

---

### 1.3 Standard Product Option Picker

Tapping any product opens a bottom sheet / full page option picker:

```
┌────────────────────────────────┐
│ ✕  Classic Chocolate Cake      │
│    250,000₫ base               │
├────────────────────────────────┤
│ SIZE  (required) ●             │
│                                │
│  ┌─────┐  ┌─────┐  ┌─────┐   │
│  │     │  │ ✓   │  │     │   │
│  │ 15cm│  │ 20cm│  │ 25cm│   │
│  │ +0₫ │  │+80k │  │+150k│   │
│  └─────┘  └─────┘  └─────┘   │
│                                │
│ FLAVOR  (required) ●           │
│                                │
│  ┌─────┐  ┌─────┐  ┌─────┐   │
│  │ ✓   │  │     │  │     │   │
│  │Choc │  │Vanil│  │Matcha│  │
│  │ +0₫ │  │ +0₫ │  │+20k │   │
│  └─────┘  └─────┘  └─────┘   │
│                                │
│ QUANTITY                       │
│         [−]  2  [+]            │
├────────────────────────────────┤
│  Total: 660,000₫               │
│  [Add to Cart]                 │
└────────────────────────────────┘
```

**Notes:**
- Selected option has a checkmark and highlighted border
- Required groups show a red dot until fulfilled
- Total at bottom updates live
- "Add to Cart" greyed out until all required groups satisfied

---

### 1.4 Custom Cake Builder

Full-page flow, one option group per step (wizard style on mobile):

```
┌────────────────────────────────┐
│ ←  Build Your Custom Cake      │
│ Step 2 of 7  ●●○○○○○           │
├────────────────────────────────┤
│                                │
│  BASE FLAVOR  (required)       │
│                                │
│  ┌────────┐  ┌────────┐        │
│  │[Image] │  │[Image] │        │
│  │        │  │  ✓     │        │
│  │ Vanilla│  │Chocolate│       │
│  │  +0₫   │  │  +0₫   │       │
│  └────────┘  └────────┘        │
│                                │
│  ┌────────┐  ┌────────┐        │
│  │[Image] │  │[Image] │        │
│  │        │  │        │        │
│  │Red Velv│  │ Matcha │        │
│  │  +20k  │  │  +25k  │       │
│  └────────┘  └────────┘        │
│                                │
├────────────────────────────────┤
│  Running total: 380,000₫       │
│  [← Back]         [Next →]    │
└────────────────────────────────┘
```

**Step 7 — Summary before submit:**
```
┌────────────────────────────────┐
│ ←  Your Custom Cake Summary    │
├────────────────────────────────┤
│  Size:          20cm  +80,000₫ │
│  Flavor:     Chocolate      +0 │
│  Frosting:   Buttercream    +0 │
│  Color:      Pastel Pink    +0 │
│  Theme:        Birthday     +0 │
│  Decorations:               ─  │
│    • Edible Roses        +30k  │
│    • Gold Leaf           +50k  │
│  Candle:    Sparkler     +25k  │
│  Writing:   Classic Script +0  │
│  Inscription: "Happy Bday!"    │
│                                │
│  Desired delivery: Mar 10      │
│                                │
│  ─────────────────────         │
│  Total: 485,000₫               │
│  Deposit (30%): 145,500₫       │
├────────────────────────────────┤
│  [Edit]     [Submit Request]   │
└────────────────────────────────┘
```

---

### 1.5 Cart

```
┌────────────────────────────────┐
│ ←  Your Cart    Bakerio D1     │
├────────────────────────────────┤
│  Choc Cake 20cm + Buttercream  │
│  ★ Edible Roses, Gold Leaf     │
│     [−] 1 [+]   360,000₫  [✕] │
├────────────────────────────────┤
│  Vanilla Cookie × 3            │
│  Size: Large                   │
│     [−] 3 [+]   135,000₫  [✕] │
├────────────────────────────────┤
│                                │
│  Subtotal:        495,000₫     │
│                                │
│  [Checkout →]                  │
└────────────────────────────────┘
```

---

### 1.6 Checkout

```
┌────────────────────────────────┐
│ ←  Checkout                    │
├────────────────────────────────┤
│  📍 Delivery Address           │
│  456 Le Loi, D1        [Edit]  │
├────────────────────────────────┤
│  🎟  Voucher Code              │
│  [_______________]  [Apply]    │
│  ✓ SUMMER20 — 20% off applied  │
├────────────────────────────────┤
│  Order Summary                 │
│  Subtotal         495,000₫     │
│  Discount  −20%   −99,000₫     │
│  Delivery fee      20,000₫     │
│  ─────────────────────         │
│  Total            416,000₫     │
├────────────────────────────────┤
│  💳 Payment                    │
│  ○ Mock Pay (dev)              │
│  ○ VNPay                       │
│  ○ Momo                        │
├────────────────────────────────┤
│  [Place Order & Pay]           │
└────────────────────────────────┘
```

---

### 1.7 Order Tracking

```
┌────────────────────────────────┐
│ ←  Order #BK-20260303-1234     │
│ Estimated arrival: 12:30       │
├────────────────────────────────┤
│                                │
│  ✅ Order Placed      10:00    │
│  ✅ Confirmed         10:03    │
│  ✅ Preparing         10:15    │
│  ✅ Ready for Pickup  11:30    │
│  🔄 Out for Delivery  11:48    │  ← current
│  ○  Delivered                  │
│                                │
│  Delivery: Minh Tran           │
│  📞 Call delivery staff        │
├────────────────────────────────┤
│  Choc Cake ×1       360,000₫  │
│  Vanilla Cookie ×3   56,000₫  │
│  Total:             416,000₫  │
└────────────────────────────────┘
```

---

### 1.8 Review (Post-Delivery Prompt)

```
┌────────────────────────────────┐
│  🎉 Order Delivered!           │
│  How was your experience?      │
├────────────────────────────────┤
│  Classic Chocolate Cake        │
│  ★ ★ ★ ★ ☆   (tap to rate)    │
│                                │
│  [Write a comment... optional] │
│                                │
│  [Skip]         [Submit →]    │
└────────────────────────────────┘
```

---

## 2. Staff Dashboard Flows

### 2.1 Order Queue

```
┌─────────────────────────────────────────┐
│  Bakerio D1 — Staff Dashboard           │
│  [Orders] [Custom] [Products]           │
├─────────────────────────────────────────┤
│  🔴 NEW (2)                             │
│  ┌─────────────────────────────────┐   │
│  │ #BK-1234  •  10:00  •  2 items  │   │
│  │ 456 Le Loi, D1                  │   │
│  │ Total: 416,000₫                 │   │
│  │ [View]  [Confirm]  [Reject]     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🟡 PREPARING (3)                       │
│  ┌─────────────────────────────────┐   │
│  │ #BK-1231  •  09:45  •  4 items  │   │
│  │ Ready by: 11:00                 │   │
│  │             [Mark Ready →]      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 2.2 Custom Order Review

```
┌─────────────────────────────────────────┐
│ ←  Custom Order #CK-0045  PENDING       │
├─────────────────────────────────────────┤
│  Customer: Jane Doe                     │
│  Requested: 2026-03-10                  │
│                                         │
│  Configuration:                         │
│  Size:           20cm                   │
│  Flavor:         Chocolate              │
│  Frosting:       Buttercream            │
│  Color Palette:  Pastel Pink            │
│  Theme:          Birthday               │
│  Decorations:    Edible Roses, Gold Leaf│
│  Candle:         Sparkler               │
│  Inscription:    "Happy Bday!"          │
│                                         │
│  Calculated total:    485,000₫          │
│  Deposit (30%):       145,500₫          │
├─────────────────────────────────────────┤
│  [Reject with reason]   [✓ Confirm]    │
└─────────────────────────────────────────┘
```

---

## 3. Delivery Staff Flows

### 3.1 Pickup Pool

```
┌─────────────────────────────────────────┐
│  Delivery Dashboard        [Active: 1]  │
├─────────────────────────────────────────┤
│  📦 AVAILABLE PICKUPS                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Order #BK-1234                    │  │
│  │ FROM: Bakerio D1, 12 Nguyen Hue   │  │
│  │ TO:   456 Le Loi, D1              │  │
│  │ Ready since: 11:30                │  │
│  │ Items: 2                          │  │
│  │ [Decline]         [Accept →]     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Custom #CK-0044                   │  │
│  │ FROM: Bakerio D3, 99 Vo Van Tan   │  │
│  │ TO:   22 Tran Hung Dao, D1        │  │
│  │ Ready since: 11:45                │  │
│  │ [Decline]         [Accept →]     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3.2 Active Delivery

```
┌─────────────────────────────────────────┐
│ ←  Delivering  #BK-1234                 │
├─────────────────────────────────────────┤
│  📍 Customer Address                    │
│  456 Le Loi, District 1, HCMC           │
│  Customer: Jane Doe  📞 0901234567      │
├─────────────────────────────────────────┤
│  Status: OUT_FOR_DELIVERY               │
│                                         │
│  [✓ Picked Up]                         │
│  [🚴 Out for Delivery]  ← current      │
│  [✅ Mark as Delivered]                │
└─────────────────────────────────────────┘
```

---

## 4. Admin Dashboard Flows

### 4.1 Overview

```
┌────────────────────────────────────────────────┐
│  Bakerio Admin         [Branches][Staff][Vouchers│
├────────────────────────────────────────────────┤
│  REPORTS  [Last 7d ▾]                           │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Orders  │  │ Revenue  │  │ Active Branch│  │
│  │   1,240  │  │ 186M ₫   │  │      5       │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  TOP PRODUCTS                                   │
│  1. Classic Choc Cake  234 orders  58.5M ₫     │
│  2. Red Velvet         198 orders  47.5M ₫     │
│  3. Custom Dream Cake  112 orders  54.3M ₫     │
│                                                 │
│  ORDERS BY BRANCH                               │
│  District 1  ████████████  420  63M ₫           │
│  District 3  ██████████    340  51M ₫           │
│  District 7  ████████      280  42M ₫           │
└────────────────────────────────────────────────┘
```

---

## 5. Error States & Empty States

### 5.1 Failed Payment
```
┌────────────────────────────────┐
│ ✕  Payment Failed              │
├────────────────────────────────┤
│                                │
│        ⚠️                      │
│                                │
│  Your payment could not be     │
│  processed. Your order has     │
│  not been placed.              │
│                                │
│  Error: CARD_DECLINED          │
│                                │
│  [Try Again]                   │
│  [Use Different Method]        │
│  [Back to Cart]                │
└────────────────────────────────┘
```

### 5.2 Cart Branch Conflict
```
┌────────────────────────────────┐
│  Switch Branch?                │
├────────────────────────────────┤
│  Your cart has 2 items from    │
│  Bakerio District 1.           │
│                                │
│  Adding this item from         │
│  Bakerio District 3 will       │
│  clear your current cart.      │
│                                │
│  [Keep Cart]  [Clear & Switch] │
└────────────────────────────────┘
```

### 5.3 Order Auto-Cancelled
```
┌────────────────────────────────┐
│  Order Cancelled               │
│  #BK-20260303-1234             │
├────────────────────────────────┤
│  This order was automatically  │
│  cancelled because the branch  │
│  did not confirm in time.      │
│                                │
│  You have not been charged.    │
│                                │
│  [Reorder]  [Browse Catalog]  │
└────────────────────────────────┘
```

### 5.4 Invalid Voucher
```
  [SUMMER21          ] [Apply]
  ⚠ This voucher has expired.
```
```
  [VIPONLY           ] [Apply]
  ⚠ Minimum order of 300,000₫ required.
```
```
  [ONCE20            ] [Apply]
  ⚠ You've already used this voucher.
```

### 5.5 Skeleton Loading States
```
┌────────────────────────────────┐
│ ← Bakerio D1                  │
├────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐   │
│  │░░░░░░░░░░│  │░░░░░░░░░░│   │  ← grey animated shimmer
│  │░░░░░░░░░░│  │░░░░░░░░░░│   │
│  │░░░░░░░░  │  │░░░░░░░░  │   │
│  │░░░░      │  │░░░░      │   │
│  └──────────┘  └──────────┘   │
└────────────────────────────────┘
```
Show skeletons while `GET /branches/:id/products` is in-flight. Minimum display time: 300ms (prevents flash).

### 5.6 Delivery Pool Empty State
```
┌─────────────────────────────────────────┐
│  Delivery Dashboard                     │
├─────────────────────────────────────────┤
│                                         │
│         📦                             │
│                                         │
│    No orders available right now.       │
│    Check back in a few minutes.         │
│                                         │
│    [Refresh]                            │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Key Interaction Patterns

### Option Card Component
Used in all option pickers (standard products + custom builder):

```
┌─────────────┐
│  [Image     ]│
│  64×64px    │
├─────────────┤
│ Option Name │
│   +30,000₫  │
└─────────────┘
     ↕
Selected state:
┌─────────────┐  ← brown border + shadow
│  [Image    ✓]│
│             │
├─────────────┤
│ Option Name │  ← bold text
│   +30,000₫  │
└─────────────┘
```

### Status Badge

| Status | Color | Label |
|---|---|---|
| PENDING_CONFIRMATION | Amber | Awaiting confirmation |
| CONFIRMED | Blue | Confirmed |
| PREPARING | Orange | Preparing |
| READY_FOR_PICKUP | Purple | Ready |
| OUT_FOR_DELIVERY | Indigo | On the way |
| DELIVERED | Green | Delivered |
| CANCELLED | Red | Cancelled |
| PENDING_REVIEW | Gray | Under review |
| IN_PRODUCTION | Orange | In production |
| REJECTED_BY_STAFF | Red | Rejected |

### Error States

- **Empty cart:** Full-page illustration + "Browse our menu" button
- **Branch closed:** Banner on catalog + greyed "Order Now" button
- **Item unavailable:** Greyed card, "Unavailable" label, still visible
- **Invalid voucher:** Inline red error below voucher input with specific reason
- **Order auto-cancelled:** In-app notification + email summary

---

## 7. Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| Mobile < 768px | Single column, bottom sheet overlays, tab nav |
| Tablet 768–1024px | Two-column product grid, side panels |
| Desktop > 1024px | Three-column catalog, persistent sidebar nav (staff/admin) |

Customer-facing pages are optimized for mobile. Staff and admin dashboards are optimized for tablet/desktop.

---

*UI Flows v1.0 — subject to refinement during Sprint 2 frontend work.*
