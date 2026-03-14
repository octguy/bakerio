# Bakerio — Component Specification

> Version 1.0 | 2026-03-09
> Audience: Designer + Frontend Developer + AI Agent
> This document is the single source of truth for how every UI component looks and behaves.
> References: [DESIGN-BRIEF.md](DESIGN-BRIEF.md) | [UI-FLOWS.md](UI-FLOWS.md)

---

## How to Read This Document

Each component is specified with:
- **Anatomy** — the sub-elements inside it
- **Variants** — the different visual forms
- **Sizes** — dimensional options
- **States** — every visual state that must be designed and implemented
- **Tokens** — exact design token values to apply (no hardcoded values)
- **Behavior** — interaction rules
- **Rules** — what is allowed and what is not

---

## 1. Button

### Anatomy
```
[ icon? ] [ label ] [ trailing-icon? ]
```

### Variants

| Variant | Background | Text | Border | Use Case |
|---|---|---|---|---|
| `primary` | `color/primary` | `color/primary-text` | none | Main CTA: Add to Cart, Place Order, Confirm |
| `secondary` | transparent | `color/primary` | 1.5px `color/primary` | Secondary action: Cancel, Go Back |
| `ghost` | transparent | `color/primary` | none | Tertiary action: Edit, View Details |
| `destructive` | `color/error` | white | none | Dangerous action: Delete, Reject Order |
| `success` | `color/success` | white | none | Positive confirmation: Mark Delivered |

### Sizes

| Size | Height | Horizontal Padding | Font Token | Icon Size | Min Width |
|---|---|---|---|---|---|
| `sm` | 32px | `space/3` (12px) | `text/caption` | 14px | 64px |
| `md` | 40px | `space/4` (16px) | `text/body-medium` | 16px | 80px |
| `lg` | 48px | `space/6` (24px) | `text/subheading` | 18px | 96px |

> ⚠️ Minimum tap target is always 44×44px. For `sm` buttons, add invisible padding around the element to meet this requirement — do not increase the visual height.

### States

| State | Visual Change |
|---|---|
| `default` | Base styles above |
| `hover` | Background opacity 90% (desktop only) |
| `active` | Scale 0.97, background opacity 85% |
| `loading` | Replace label with `Spinner` (16px), disable all interaction, maintain width |
| `disabled` | Opacity 40%, cursor `not-allowed`, no hover/active effect |

### Layout Rules
- Full width (`width: 100%`) on mobile screens (≤390px) unless inside an inline context
- Auto width on desktop dashboards
- Icon + label gap: `space/2` (8px)
- Border radius: `radius/md` (8px)
- Font weight: always 500 or 600 — never 400

### Do / Don't
- ✅ Use `primary` for the single most important action per screen
- ✅ Use `secondary` for the escape action (Cancel, Back)
- ❌ Never put two `primary` buttons on the same screen
- ❌ Never truncate button labels — resize the button or shorten the copy
- ❌ Never use `ghost` as the only button — pair it with a `primary` or `secondary`

---

## 2. Input

### Anatomy
```
[ Label ]
[ leading-icon? ] [ input text / placeholder ] [ trailing-icon? ]
[ Helper text / Error message ]
```

### Variants

| Variant | Use Case |
|---|---|
| `default` | Standard text input |
| `search` | Search fields — leading search icon, trailing clear icon |
| `password` | Password fields — trailing toggle icon (show/hide) |
| `textarea` | Multi-line text — inscription field on custom builder |

### Dimensions

| Property | Value |
|---|---|
| Height (single-line) | 44px |
| Horizontal padding | `space/3` (12px) |
| Vertical padding | `space/3` (12px) |
| Border | 1.5px `color/border` |
| Border radius | `radius/md` (8px) |
| Label margin-bottom | `space/1` (4px) |
| Helper text margin-top | `space/1` (4px) |
| Textarea min-height | 88px (4 lines) |

### States

| State | Border | Background | Text |
|---|---|---|---|
| `default` | 1.5px `color/border` | `color/surface` | `color/body-text` |
| `focused` | 2px `color/primary` | `color/surface` | `color/body-text` |
| `filled` | 1.5px `color/border` | `color/surface` | `color/body-text` |
| `error` | 2px `color/error` | `color/surface` | `color/body-text` |
| `disabled` | 1.5px `color/border` | `color/background` | `color/muted` |
| `read-only` | none | transparent | `color/body-text` |

### Token Mapping

| Element | Token |
|---|---|
| Label | `text/label`, `color/body-text` |
| Placeholder | `text/body`, `color/muted` |
| Input text | `text/body`, `color/body-text` |
| Helper text | `text/caption`, `color/muted` |
| Error message | `text/caption`, `color/error` |
| Leading/trailing icon | 18px, `color/muted` (default) / `color/primary` (focused) |

### Rules
- Label is always visible — never use placeholder as a substitute for a label
- Error message replaces helper text — do not show both simultaneously
- Character count shown below right for fields with a max length (e.g., inscription: `0/30`)
- ❌ Never remove the label — accessibility requirement

---

## 3. Badge / Status Badge

### Anatomy
```
[ dot? ] [ label ]
```

### Order Status Badges (maps to FSM in ARCHITECTURE.md §10)

| Status | Background | Text Color | Label |
|---|---|---|---|
| `PENDING_CONFIRMATION` | `#FEF3C7` | `#92400E` | Pending |
| `CONFIRMED` | `#DBEAFE` | `#1E40AF` | Confirmed |
| `PREPARING` | `#EDE9FE` | `#5B21B6` | Preparing |
| `READY_FOR_PICKUP` | `#D1FAE5` | `#065F46` | Ready |
| `ASSIGNED` | `#CFFAFE` | `#155E75` | Assigned |
| `PICKED_UP` | `#FEE2E2` | `#991B1B` | Picked Up |
| `OUT_FOR_DELIVERY` | `#FFF7ED` | `#9A3412` | Out for Delivery |
| `DELIVERED` | `#D1FAE5` | `#065F46` | Delivered |
| `CANCELLED` | `#F3F4F6` | `#374151` | Cancelled |
| `PAYMENT_FAILED` | `#FEE2E2` | `#991B1B` | Payment Failed |

> These colors are fixed. Do not change them — they are mapped directly to code constants.

### General Badge Variants

| Variant | Background | Text |
|---|---|---|
| `success` | `#D1FAE5` | `#065F46` |
| `warning` | `#FEF3C7` | `#92400E` |
| `error` | `#FEE2E2` | `#991B1B` |
| `info` | `#DBEAFE` | `#1E40AF` |
| `neutral` | `#F3F4F6` | `#374151` |

### Dimensions

| Property | Value |
|---|---|
| Height | 24px |
| Horizontal padding | `space/2` (8px) |
| Border radius | `radius/sm` (4px) |
| Font | `text/label` (12px, 500, uppercase) |
| Dot size | 6px circle, same color as text |

### Rules
- ❌ Never use `color/decorative` (golden) for status badges — it fails WCAG
- ✅ Always include a text label — never dot-only (accessibility)
- ✅ Badge width is auto — never fixed width

---

## 4. ProductCard

### Anatomy
```
┌──────────────────────────┐
│      [ image ]           │  ← 16:9 ratio, object-fit: cover
├──────────────────────────┤
│ [Category badge]         │
│ [Product name]           │  ← text/subheading
│ [★★★★☆ 4.2 (23)]        │  ← text/caption, color/muted
│ [Price] [Add button →]   │  ← price: text/price + color/accent
└──────────────────────────┘
```

### Dimensions

| Property | Value |
|---|---|
| Card width | 100% of container (single column mobile, 2-col grid tablet+) |
| Image height | 160px |
| Internal padding | `space/4` (16px) |
| Gap between elements | `space/2` (8px) |
| Border radius | `radius/lg` (12px) |
| Box shadow | `0 1px 3px rgba(0,0,0,0.08)` |
| Background | `color/surface` |

### States

| State | Visual Change |
|---|---|
| `available` | Default styles |
| `unavailable` | Image has 50% black overlay + "Unavailable" badge centered on image. All interactive elements disabled. Card still visible. |
| `loading` (skeleton) | Replace image with grey rect, replace text with grey rects of matching widths. Animate with shimmer. |

### Token Mapping

| Element | Token |
|---|---|
| Product name | `text/subheading`, `color/body-text` |
| Category | `text/label`, `color/muted` |
| Rating text | `text/caption`, `color/muted` |
| Star icons (filled) | `color/decorative` |
| Price | `text/price`, `color/accent` |

### Rules
- ❌ Never truncate the product name to 1 line — allow 2 lines max, then ellipsis
- ✅ Add to Cart button on the card is `primary` size `sm`
- ✅ Tapping the image or name navigates to product detail — the whole card is not a button
- ❌ Do not show the full description on the card — name + price + rating only

---

## 5. OptionCard

Used in: product configuration screen, custom cake builder wizard.

### Anatomy
```
┌───────────────┐
│   [ image? ]  │
│   [ name ]    │
│ [+price delta]│
└───────────────┘
```

### Dimensions

| Property | Value |
|---|---|
| Width | Fixed 96px (horizontal scroll list) OR 100% (grid 2-col) |
| Image height | 64px, `radius/md`, object-fit: cover |
| Padding | `space/3` (12px) |
| Gap | `space/2` (8px) |
| Border radius | `radius/md` (8px) |
| Border (default) | 1.5px `color/border` |
| Border (selected) | 2px `color/primary` |
| Background (selected) | `color/primary` at 5% opacity |

### States

| State | Border | Background | Text |
|---|---|---|---|
| `default` | 1.5px `color/border` | `color/surface` | `color/body-text` |
| `selected` | 2px `color/primary` | `color/primary` 5% opacity | `color/primary` |
| `disabled` | 1.5px `color/border` | `color/background` | `color/muted` |
| `selected+disabled` | — | — | Not a valid state — disabled options cannot be selected |

### Token Mapping

| Element | Token |
|---|---|
| Option name | `text/body-medium`, inherits state text color |
| Price delta (positive) | `text/caption`, `color/accent` — show as `+15,000 ₫` |
| Price delta (zero) | `text/caption`, `color/muted` — show as `Included` |
| Checkmark icon (selected) | 16px, `color/primary`, top-right corner |

### Rules
- ✅ If no image, show name only — card height adjusts
- ✅ Multi-select groups show a checkbox icon, single-select groups show a radio-style checkmark
- ❌ Never remove disabled options — show them greyed out so users understand they exist

---

## 6. OrderRow

Used in: customer order history, staff order queue, delivery pool.

### Anatomy
```
[ Order ID + date ]     [ Status badge ]
[ Branch name ]         [ Total amount ]
[ N items summary ]     [ Action button? ]
```

### Dimensions

| Property | Value |
|---|---|
| Row padding | `space/4` (16px) vertical, `space/4` horizontal |
| Row min-height | 72px |
| Divider | 1px `color/border` between rows |
| Border radius | `radius/lg` (12px) if card-style, none if table row |

### Layout Variants

| Variant | Layout | Used In |
|---|---|---|
| `card` | Stacked, full-width card | Customer order history (mobile) |
| `table-row` | Horizontal row | Staff dashboard, Admin panel (desktop) |

### States

| State | Visual Change |
|---|---|
| `new` (PENDING_CONFIRMATION) | Left border 4px `color/primary` + subtle background tint |
| `default` | No border accent |
| `loading` | Skeleton animation |

### Rules
- ✅ Order ID shown as short ID (last 8 chars) — not full UUID
- ✅ Date shown as relative time if < 24h ("32 minutes ago"), absolute if older ("Mar 5")
- ✅ Total shown with `₫` suffix, formatted with thousands separator: `85,000 ₫`
- ❌ Never show more than 2 action buttons per row

---

## 7. CartItem

### Anatomy
```
[ Product image ]  [ Product name        ]  [ Remove ✕ ]
                   [ Selected options    ]
                   [ Quantity stepper    ]  [ Line total ]
```

### Dimensions

| Property | Value |
|---|---|
| Image | 64×64px, `radius/md`, object-fit: cover |
| Row padding | `space/4` (16px) |
| Gap (image to content) | `space/3` (12px) |
| Quantity stepper height | 32px |
| Stepper button size | 32×32px |

### Quantity Stepper Sub-component

```
[ − ] [ quantity ] [ + ]
```

- `−` button: disabled when quantity = 1
- `+` button: disabled when quantity = max (99)
- Quantity display: `text/body-medium`, centered, min-width 32px
- Border: 1.5px `color/border`, `radius/md`

### Token Mapping

| Element | Token |
|---|---|
| Product name | `text/body-medium`, `color/body-text` |
| Selected options | `text/caption`, `color/muted` — comma-separated |
| Line total | `text/body-medium`, `color/accent` |
| Remove button | 20px ✕ icon, `color/muted` — tap target 44×44px |

### Rules
- ✅ Selected options shown as a compact comma-separated summary: "Large, Chocolate, Fondant"
- ❌ Never show the price delta of individual options in the cart — show line total only
- ✅ Swipe-to-delete gesture on mobile (in addition to the ✕ button)

---

## 8. Skeleton (Loading State)

Used for: any data-fetching screen before content loads.

### Rules
- Background: `#E5E7EB` (grey-200)
- Animation: shimmer (left-to-right gradient sweep), duration 1.5s, infinite
- Minimum display time: 300ms — do not flash skeletons for fast loads
- Shape: match the exact shape and size of the content it replaces
- ❌ Never use a spinner as a substitute for a skeleton in list/card views
- ✅ Use a spinner only for action feedback (button loading state, form submission)

### Required Skeleton Screens

| Screen | What to Skeleton |
|---|---|
| Product catalog | ProductCard grid (show 4 skeleton cards) |
| Cart | CartItem rows |
| Order history | OrderRow list |
| Order detail | Status timeline + item list |
| Staff order queue | OrderRow table |

---

## 9. Toast / Alert

Used for: success/error feedback after actions.

### Anatomy
```
[ icon ] [ message ]  [ action? ]  [ ✕ ]
```

### Variants

| Variant | Icon | Background | Text |
|---|---|---|---|
| `success` | ✓ circle | `#D1FAE5` | `#065F46` |
| `error` | ✕ circle | `#FEE2E2` | `#991B1B` |
| `warning` | ! triangle | `#FEF3C7` | `#92400E` |
| `info` | i circle | `#DBEAFE` | `#1E40AF` |

### Dimensions

| Property | Value |
|---|---|
| Width | `calc(100% - 32px)`, max-width 400px |
| Padding | `space/4` (16px) |
| Border radius | `radius/md` (8px) |
| Position | Bottom of screen, 16px from bottom edge |
| Auto-dismiss | 4 seconds (success/info), never auto-dismiss errors |

### Rules
- ✅ Toast stacks — new toasts appear above existing ones
- ✅ Max 3 toasts visible simultaneously
- ❌ Never use toast for critical errors that block the user — use an inline error message instead

---

## 10. Navbar & Bottom Tab Bar

### Bottom Tab Bar (Customer App — Mobile)

| Tab | Icon | Label |
|---|---|---|
| Home | House | Home |
| Browse | Grid | Catalog |
| Orders | Receipt | Orders |
| Profile | Person | Profile |

| Property | Value |
|---|---|
| Height | 56px + safe area inset |
| Background | `color/surface` |
| Border top | 1px `color/border` |
| Active icon + label | `color/primary` |
| Inactive icon + label | `color/muted` |
| Icon size | 24px |
| Label | `text/caption` |
| Cart badge | Red dot, 8px, top-right of icon |

### Top Navbar (Staff / Delivery / Admin — Desktop + Mobile)

| Property | Value |
|---|---|
| Height | 56px |
| Background | `color/primary` |
| Title | `text/subheading`, `color/primary-text` |
| Back icon | 24px chevron-left, `color/primary-text` |
| Action icons | 24px, `color/primary-text` |
| Padding | `space/4` (16px) horizontal |

---

## Revision Log

| Date | Author | Change |
|---|---|---|
| 2026-03-09 | Team | Initial document — 10 components specified |
