# Bakerio — Figma to Frontend Guide

> Version 1.0 | 2026-03-09
> Audience: Designer + Frontend Developer
> References: [UI-FLOWS.md](UI-FLOWS.md) | [DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md) | [SRS.md](SRS.md)

---

## 1. What to Tell the Designer

### 1.1 Start Here

Hand him these documents before he opens Figma:

| Document | Why |
|---|---|
| `docs/UI-FLOWS.md` | Wireframes, navigation maps, color palette, component list, status badges — this is his brief, not a suggestion |
| `docs/SRS.md §3` | User roles and responsibilities — he must understand whose screen he's designing |

### 1.2 Screen Design Order

Design in this order. Later sprints depend on earlier screens being ready.

| Priority | Screens | Sprint Needed |
|---|---|---|
| 1 | Branch list → Product catalog → Product detail | Sprint 2 |
| 2 | Cart → Checkout → Order confirmation | Sprint 3–4a |
| 3 | Custom cake builder wizard (7 steps) | Sprint 6 |
| 4 | Order tracking / status timeline | Sprint 4b |
| 5 | Staff dashboard — order queue | Sprint 4b |
| 6 | Delivery dashboard — pickup pool + status | Sprint 5 |
| 7 | Admin panel — branches, staff, vouchers, reports | Sprint 9 |

### 1.3 Non-Negotiable Figma Requirements

These are required for the handoff to work. They are not optional.

**Components**
- Every element that appears in 2+ screens must be a Figma component — not duplicated frames.
- Required components at minimum: `ProductCard`, `OptionCard`, `StatusBadge`, `OrderRow`, `Button` (all variants), `Input` (all states), `Toast/Alert`.

**Auto Layout**
- Every frame must use Auto Layout. No fixed-position elements.
- Your frontend uses flexbox — the frames must reflect that.

**Design Tokens as Figma Variables**
- Colors, spacing, border radius, and font sizes must be Figma variables — not hardcoded hex values.
- You will map these directly to Tailwind config or CSS variables.

**Color Palette (already decided — do not change)**

| Token | Hex | Usage |
|---|---|---|
| `color/primary` | `#6B3F1A` | Warm Brown — primary actions, headers |
| `color/surface` | `#FDF6EC` | Cream — page backgrounds |
| `color/accent-decorative` | `#E8A020` | Golden — icons, borders only (fails WCAG on white) |
| `color/accent-text` | `#92610A` | Dark Amber — price text, links (4.6:1 contrast) |
| `color/neutral` | `#FFFFFF` | White — card backgrounds |
| `color/text` | `#2C2C2C` | Charcoal — body text |

**All States Designed**
For every interactive component, design all states:
- Default / Hover / Active / Disabled / Error / Loading skeleton

No exceptions. If the happy path is the only state designed, the frontend implementation will be incomplete.

**Error States Required**
These specific screens must be designed — they are documented in `UI-FLOWS.md §5`:
- Failed payment
- Invalid voucher (3 variants: expired / already used / min not met)
- Cart branch conflict (409 prompt)
- Order auto-cancelled notification
- Empty delivery pool
- Skeleton loading (at least one example)

**Viewport**
- Mobile-first: design at **390px width** (iPhone 14 standard)
- Desktop breakpoint at **1280px** for staff and admin dashboards only
- Customer-facing screens: mobile only in v1

**Annotations**
- Any behavior not obvious from the visual (scroll behavior, animation, back button intent, tap target size) gets a Figma comment on that frame.

---

## 2. The Handoff Workflow

```
Designer marks frame "Ready for Dev" in Figma
            ↓
Developer opens Figma Dev Mode (Inspect panel)
            ↓
Extract design tokens → map to Tailwind / CSS variables (once, Sprint 0)
            ↓
Build component inventory → define React props interface (human work)
            ↓
AI writes component body given: props interface + one-sentence spec
            ↓
Developer pixel-checks against Figma at same viewport width
            ↓
Merge → designer reviews in browser → signs off
```

---

## 3. Converting Figma to Code

### 3.1 Step 1 — Design Tokens (Do Once in Sprint 0)

Before writing any components, extract Figma variables and create the Tailwind config:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary:   '#6B3F1A',
      surface:   '#FDF6EC',
      accent:    '#92610A',      // text-safe only
      golden:    '#E8A020',      // decorative only
      neutral:   '#FFFFFF',
      text:      '#2C2C2C',
    },
    // Add spacing, borderRadius, fontFamily from Figma variables
  }
}
```

Never hardcode hex values in component files. Always use the token name.

### 3.2 Step 2 — Component Inventory (Human Work, Before Coding)

Before writing any React, list every Figma component and its props. AI cannot do this — it requires reading the design with understanding of context.

Example:

```ts
// ProductCard
type ProductCardProps = {
  name: string
  image: string
  basePrice: number
  averageRating: number | null
  isAvailable: boolean
}

// StatusBadge
type StatusBadgeProps = {
  status: OrderStatus   // from ARCHITECTURE.md §10 canonical FSM
}

// OptionCard
type OptionCardProps = {
  label: string
  image?: string
  priceDelta: number    // 0 = no extra cost
  isSelected: boolean
  isDisabled: boolean
  onSelect: () => void
}
```

Write this list before Sprint 2 frontend work begins. Update it as new screens are designed.

### 3.3 Step 3 — One Component = One AI Task

Once the props interface is defined, AI can write the component body.

**The AI gate applies here too:**
> "Can I describe this component's props, layout, and states in one sentence?"

- ✅ "Render a `ProductCard` with image top, name + price row, rating stars, and a greyed overlay when `isAvailable = false`, using Tailwind classes from the design tokens"
- ❌ "Build the product catalog page" — decompose first

**Give AI:**
- The props interface (TypeScript)
- Exact values from Figma Inspect: padding, gap, border radius, font size, font weight
- Which states to handle and what each looks like

**You review:**
- Does it match the Figma frame pixel-for-pixel at 390px?
- Does it handle all designed states (error, disabled, loading)?
- Does it use only token class names — no hardcoded colors?

### 3.4 Step 4 — Measurements from Figma Inspect

Use Figma Dev Mode Inspect panel for all values. Never eyeball spacing or typography.

| What to copy | Where to find it in Figma |
|---|---|
| Padding / gap | Inspect → Layout |
| Font size, weight, line height | Inspect → Text |
| Border radius | Inspect → Design |
| Box shadow | Inspect → Design → Effects |
| Color (as token name, not hex) | Inspect → Fill → map to your token |

### 3.5 Step 5 — Pixel-Check Before Marking Done

Use **PerfectPixel** (browser extension) or a screenshot overlay tool:
1. Export the Figma frame as PNG at 1x
2. Overlay it on the rendered component at the same viewport width
3. Fix any deviation before moving on — do not defer visual bugs

This is the developer's responsibility, not the designer's.

---

## 4. The One Rule

The designer designs the **what**. The developer decides the **how it's built**.

If his design includes something that contradicts a documented decision — a free-text input on the custom builder, a GPS map, a WebSocket live feed — **reject it and reference the SRS**. Do not implement it. Do not let him redesign around it without a team decision first and a corresponding update to the docs.

Scope changes go through the same change request process as feature changes.

---

## 5. Revision Log

| Date | Author | Change |
|---|---|---|
| 2026-03-09 | Team | Initial document created |

---

*Update this guide whenever the handoff workflow or Figma requirements change.*
