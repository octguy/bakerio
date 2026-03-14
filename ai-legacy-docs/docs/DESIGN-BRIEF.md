# Bakerio — Designer Brief & Figma Guide

> Version 1.0 | 2026-03-09
> Audience: Designer
> References: [UI-FLOWS.md](UI-FLOWS.md) | [COMPONENT-SPEC.md](COMPONENT-SPEC.md) | [DESIGN-AGENT-GUIDE.md](DESIGN-AGENT-GUIDE.md)

---

## 1. Read These First

Before opening Figma:

| Document | What You Need From It |
|---|---|
| `UI-FLOWS.md` | ASCII wireframes, navigation maps, color palette, component list, status badges — this is your brief |
| `SRS.md §3` | User roles — understand whose screen you're designing before designing it |
| `COMPONENT-SPEC.md` | Exact specs for every component — follow these, do not improvise |

---

## 2. Figma File Structure

One file, these pages in order:

```
1. 🎨 Design Tokens       ← colors, typography, spacing, radius variables
2. 🧩 Component Library   ← all reusable components
3. 📱 Customer App        ← customer-facing screens
4. 🍞 Staff Dashboard     ← branch staff screens
5. 🚗 Delivery App        ← delivery staff screens
6. ⚙️ Admin Panel         ← admin screens
7. 📐 Wireframes (ref)    ← paste UI-FLOWS.md content here, lock the layer
```

Never design screens on the component page. Never put components on a screen page.

---

## 3. Design Tokens

Set up as **Figma Variables** (not Styles). Variables → Collections:

### Color Variables

**Collection: `primitive`** (raw values, never apply directly to components)

| Variable | Value |
|---|---|
| `brown-900` | `#3B1F09` |
| `brown-700` | `#6B3F1A` |
| `amber-600` | `#92610A` |
| `golden-400` | `#E8A020` |
| `cream-50` | `#FDF6EC` |
| `white` | `#FFFFFF` |
| `gray-800` | `#2C2C2C` |
| `gray-400` | `#9CA3AF` |
| `red-500` | `#EF4444` |
| `green-500` | `#22C55E` |
| `blue-500` | `#3B82F6` |

**Collection: `semantic`** (reference primitives — apply these to components)

| Variable | Maps To | Usage |
|---|---|---|
| `color/background` | `cream-50` | Page backgrounds |
| `color/surface` | `white` | Card, modal, input backgrounds |
| `color/primary` | `brown-700` | Primary buttons, headers, links |
| `color/primary-text` | `white` | Text on primary backgrounds |
| `color/accent` | `amber-600` | Price text, active states, links |
| `color/decorative` | `golden-400` | Star icons, borders only — never on text |
| `color/body-text` | `gray-800` | All body text |
| `color/muted` | `gray-400` | Placeholder text, disabled text, captions |
| `color/error` | `red-500` | Error states, destructive actions |
| `color/success` | `green-500` | Success states, delivered status |
| `color/info` | `blue-500` | Informational states |
| `color/border` | `cream-50` darkened 10% | Dividers, input borders |

### Typography Variables

Font: **Inter** (Google Fonts, free)

| Token | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|
| `text/display` | 24px | 700 | 32px | -0.5px |
| `text/heading` | 20px | 600 | 28px | 0 |
| `text/subheading` | 16px | 600 | 24px | 0 |
| `text/body` | 14px | 400 | 20px | 0.1px |
| `text/body-medium` | 14px | 500 | 20px | 0.1px |
| `text/caption` | 12px | 400 | 16px | 0.2px |
| `text/label` | 12px | 500 | 16px | 0.5px uppercase |
| `text/price` | 16px | 700 | 24px | 0 |

### Spacing Variables

8pt grid — all values are multiples of 4px.

| Token | Value |
|---|---|
| `space/1` | 4px |
| `space/2` | 8px |
| `space/3` | 12px |
| `space/4` | 16px |
| `space/5` | 20px |
| `space/6` | 24px |
| `space/8` | 32px |
| `space/10` | 40px |
| `space/12` | 48px |

If a value is not in this table, round to the nearest 4px. Never use 13px, 22px, 7px, etc.

### Border Radius Variables

| Token | Value | Usage |
|---|---|---|
| `radius/sm` | 4px | Badges, chips |
| `radius/md` | 8px | Buttons, inputs, small cards |
| `radius/lg` | 12px | Cards, modals |
| `radius/xl` | 16px | Bottom sheets, large modals |
| `radius/full` | 9999px | Pills, avatars |

---

## 4. Screen Design Order

Design in this order — later sprints depend on earlier screens.

| Priority | Screens | Sprint |
|---|---|---|
| 1 | Branch list → Product catalog → Product detail | Sprint 2 |
| 2 | Cart → Checkout → Order confirmation | Sprint 3–4a |
| 3 | Custom cake builder wizard (7 steps) | Sprint 6 |
| 4 | Order tracking / status timeline | Sprint 4b |
| 5 | Staff dashboard — order queue | Sprint 4b |
| 6 | Delivery dashboard — pickup pool + status | Sprint 5 |
| 7 | Admin panel — branches, staff, vouchers, reports | Sprint 9 |

---

## 5. Per-Screen Design Process

For each screen, follow this order:

1. **Open wireframe reference** from `UI-FLOWS.md` in a locked layer beside your canvas
2. **Grey box layout** — no colors, no fonts. Just rectangles. Confirm the information hierarchy.
3. **Apply spacing and typography tokens** — use variables only, no hardcoded values
4. **Apply color tokens** — semantic tokens only, never primitives
5. **Design all states** — happy path → loading skeleton → empty state → error state
6. **Annotate** — add a Figma comment on any interaction not obvious from the visual

---

## 6. Non-Negotiable Rules

| Rule | Why |
|---|---|
| Every frame uses Auto Layout | Frontend uses flexbox — frames must reflect that |
| Every repeated element is a Figma Component | If you paste something twice, it must be a component |
| Only semantic color tokens on components | Enables palette changes without touching every component |
| 8pt grid — all values divisible by 4 | Consistency and clean developer handoff |
| All states designed for every interactive component | Incomplete states become ugly `undefined` renders in production |
| Error states required for every major flow | Listed in `UI-FLOWS.md §5` — these are not optional |
| Mobile-first at 390px | Customer app only. Staff/admin at 1280px desktop. |
| Minimum tap target 44×44px | iOS HIG and Android Material requirement |

---

## 7. UX Principles by Role

### Customer
- **Thumb zone** — primary actions (Add to Cart, Place Order) in the bottom 40% of the 390px screen
- **Running price** — always show total in a sticky bottom bar during product configuration and custom builder
- **Progress indicators** — step counter on the custom builder wizard (Step 2 of 7)
- **Trust at confirmation** — order confirmation screen: order number large, prominent, full-screen success state

### Staff (Baker)
- **Density over beauty** — table layout, not cards. Staff are working, not browsing.
- **Status first** — colored status badge is the first thing the eye lands on in every order row
- **Urgency** — orders in `PENDING_CONFIRMATION` get a distinct visual treatment (colored left border + timer countdown). Staff have 15 minutes.

### Delivery Staff
- **One action per screen** — one obvious primary button: Accept / Picked Up / Delivered
- **Address is the hero** — delivery address is the largest text on the screen
- **Minimal chrome** — no decorative elements. Delivery staff may be moving.

### Admin
- **Desktop layout** — sidebar navigation + content area at 1280px
- **Data tables over cards** — admins scan many records; tables beat card grids
- **Numbers are primary** — analytics screens lead with the metric, not the label

---

## 8. Component Reference

See `COMPONENT-SPEC.md` for exact specs on every component: dimensions, states, tokens, behavior, and do/don'ts.

For complex features (custom builder wizard, checkout flow, order timeline), see `DESIGN-AGENT-GUIDE.md`.

---

## 9. Handoff Checklist (before marking "Ready for Dev")

- [ ] All frames use Auto Layout
- [ ] All colors reference semantic variables — no hardcoded hex
- [ ] All text references typography variables
- [ ] All spacing references spacing variables
- [ ] Every interactive component has all states designed
- [ ] Error states exist for this flow
- [ ] Minimum tap target 44×44px on all interactive elements
- [ ] Annotations added for all non-obvious interactions
- [ ] Frame is at correct viewport (390px mobile / 1280px desktop)
- [ ] Frame named clearly: `[Role] / [Screen] / [State]` e.g. `Customer / Cart / Empty`

---

## 10. Revision Log

| Date | Author | Change |
|---|---|---|
| 2026-03-09 | Team | Initial document created |
