# Bakerio Branding Website — Implementation Plan

> A public-facing bakery branding website inspired by pizza4ps.com/vn.
> Full-bleed video/image heroes, GSAP scroll animations, elegant typography, warm sponge-cake palette.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.6 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Animations | GSAP + ScrollTrigger | ^3.12 |
| i18n | next-intl | ^4 |
| API | @repo/api-client | workspace |
| UI Tokens | @repo/ui | workspace |
| Fonts | Google Fonts (Sacramento, Lora, Inter) | next/font |
| Maps | Leaflet / react-leaflet | ^4 |
| SEO | next/metadata + JSON-LD | built-in |
| Images | next/image + sharp | built-in |

---

## Design Tokens (from .internal_docs)

```
Backgrounds: cream #FDF8F3, vanilla #FAF3EB, butter #F5EBD9, crust #EDE0CC
Text: espresso #2C1810, cocoa #4A3228, caramel #7A5C3E, muted #A68B6B
Accents: golden #D4943A, honey #E8A94E, cinnamon #B5722A, rose #C97B6B
Fonts: Sacramento (cursive accents), Lora (serif headings), Inter (body)
Radius: 10px cards, 8px buttons, 6px inputs
Shadows: soft 0 2px 8px rgba(44,24,16,0.06), card 0 4px 16px rgba(44,24,16,0.08)
```

---

## File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                    # Root layout with fonts, navbar, footer
│   │   ├── page.tsx                      # Homepage
│   │   ├── menu/
│   │   │   └── page.tsx                  # Menu page (categories + items)
│   │   ├── locations/
│   │   │   └── page.tsx                  # Locations page (map + store cards)
│   │   ├── about/
│   │   │   └── page.tsx                  # About page (story + team + values)
│   │   ├── blog/
│   │   │   ├── page.tsx                  # Blog listing
│   │   │   └── [slug]/
│   │   │       └── page.tsx              # Blog detail
│   │   └── contact/
│   │       └── page.tsx                  # Contact page
│   ├── layout.tsx                        # Root HTML shell (lang, viewport)
│   ├── not-found.tsx                     # 404 page
│   ├── robots.ts                         # robots.txt generation
│   └── sitemap.ts                        # sitemap.xml generation
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx                    # Sticky navbar (transparent → solid)
│   │   ├── MobileMenu.tsx               # Slide-in mobile menu panel
│   │   ├── Footer.tsx                    # Footer with links, social, newsletter
│   │   └── LanguageSwitcher.tsx          # EN/VN toggle
│   │
│   ├── sections/
│   │   ├── HeroSection.tsx              # Full-viewport video/image hero
│   │   ├── FeaturedProducts.tsx         # Featured products carousel/grid
│   │   ├── StorySection.tsx             # Brand story with parallax
│   │   ├── TestimonialsSection.tsx      # Customer testimonials slider
│   │   ├── CTASection.tsx               # Full-width call-to-action
│   │   ├── LocationsPreview.tsx         # Homepage locations preview
│   │   ├── StatsCounter.tsx             # Animated number counters
│   │   └── NewsletterSection.tsx        # Email signup section
│   │
│   ├── cards/
│   │   ├── ProductCard.tsx              # Menu item card
│   │   ├── LocationCard.tsx             # Store location card
│   │   ├── TestimonialCard.tsx          # Testimonial card
│   │   ├── BlogCard.tsx                 # Blog post card
│   │   └── TeamMemberCard.tsx           # Team member card with bio
│   │
│   ├── ui/
│   │   ├── SectionHeader.tsx            # Reusable section title + subtitle
│   │   ├── Button.tsx                   # CTA button variants
│   │   ├── Badge.tsx                    # Category/tag badge
│   │   ├── Skeleton.tsx                 # Loading skeleton
│   │   ├── ScrollReveal.tsx             # GSAP scroll reveal wrapper
│   │   └── ParallaxImage.tsx            # Parallax image component
│   │
│   └── seo/
│       ├── JsonLd.tsx                   # JSON-LD structured data
│       └── OgImage.tsx                  # OG image template
│
├── lib/
│   ├── gsap.ts                          # GSAP registration + plugins
│   ├── fonts.ts                         # next/font declarations
│   ├── metadata.ts                      # Shared metadata helpers
│   └── api.ts                           # API client wrapper for SSG
│
├── hooks/
│   ├── useScrollReveal.ts              # GSAP scroll reveal hook
│   ├── useParallax.ts                  # Parallax scroll hook
│   ├── useCountUp.ts                   # Counter animation hook
│   └── useMediaQuery.ts               # Responsive breakpoint hook
│
├── i18n/
│   ├── request.ts                      # next-intl request config
│   ├── routing.ts                      # Locale routing config
│   └── navigation.ts                   # Typed navigation helpers
│
├── messages/
│   ├── vi.json                         # Vietnamese translations
│   └── en.json                         # English translations
│
├── styles/
│   └── globals.css                     # Tailwind imports + custom properties
│
├── types/
│   └── index.ts                        # Shared TypeScript types
│
└── data/
    ├── testimonials.ts                 # Static testimonial data
    ├── team.ts                         # Team members data
    └── values.ts                       # Brand values data

public/
├── videos/
│   └── hero-bakery.mp4                 # Hero background video
├── images/
│   ├── hero-poster.jpg                 # Video poster fallback
│   ├── about/                          # About page images
│   ├── team/                           # Team member photos
│   └── og/                             # OG images
├── fonts/                              # Self-hosted font fallbacks (optional)
└── favicon.ico
```

---

## Page Specifications

### 1. Homepage (`/[locale]/page.tsx`)

| Section | Component | Data Source | Animation |
|---------|-----------|-------------|-----------|
| Hero | `HeroSection` | Static video + text | Fade-in title, parallax overlay |
| Featured Products | `FeaturedProducts` | `@repo/api-client` → products | Staggered card reveal |
| Brand Story | `StorySection` | i18n messages | Parallax image, text slide-up |
| Stats | `StatsCounter` | Static data | Counter animation on scroll |
| Testimonials | `TestimonialsSection` | Static data | Carousel auto-scroll |
| Locations Preview | `LocationsPreview` | `@repo/api-client` → branches | Staggered cards |
| Newsletter | `NewsletterSection` | — | Fade-in |
| CTA | `CTASection` | i18n messages | Scale-up on scroll |

**SEO:** Homepage meta, Organization JSON-LD, BreadcrumbList
**SSG:** `generateStaticParams` for locales, `revalidate: 3600`

---

### 2. Menu Page (`/[locale]/menu/page.tsx`)

| Section | Component | Data Source | Animation |
|---------|-----------|-------------|-----------|
| Page Header | `SectionHeader` | i18n | Fade-in |
| Category Tabs | Custom tabs | `@repo/api-client` → categories | Tab switch fade |
| Product Grid | `ProductCard` grid | `@repo/api-client` → products | Staggered reveal per category |

**Layout:** Sticky category sidebar (desktop), horizontal scroll tabs (mobile)
**SEO:** Menu page meta, Menu JSON-LD schema
**SSG:** Fetch all products + categories at build time

---

### 3. Locations Page (`/[locale]/locations/page.tsx`)

| Section | Component | Data Source | Animation |
|---------|-----------|-------------|-----------|
| Page Header | `SectionHeader` | i18n | Fade-in |
| Map | Leaflet map | `@repo/api-client` → branches | — |
| Store Cards | `LocationCard` grid | `@repo/api-client` → branches | Staggered reveal |
| Region Filter | Tab/dropdown | Derived from branches | — |

**Layout:** Map top (50vh), cards below. Click card → pan map.
**SEO:** LocalBusiness JSON-LD per branch
**SSG:** Fetch all branches at build time

---

### 4. About Page (`/[locale]/about/page.tsx`)

| Section | Component | Data Source | Animation |
|---------|-----------|-------------|-----------|
| Hero | `HeroSection` (image variant) | Static image | Parallax |
| Origin Story | Prose section | i18n messages | Paragraph fade-in |
| Values | Value cards (3) | `data/values.ts` | Staggered reveal |
| Team | `TeamMemberCard` grid | `data/team.ts` | Staggered reveal |
| Timeline | Custom timeline | i18n messages | Scroll-linked progress |

**SEO:** AboutPage JSON-LD, team member Person schema
**SSG:** Fully static

---

### 5. Blog/News Page (`/[locale]/blog/page.tsx`)

| Section | Component | Data Source | Animation |
|---------|-----------|-------------|-----------|
| Page Header | `SectionHeader` | i18n | Fade-in |
| Blog Grid | `BlogCard` grid | Static MDX or CMS | Staggered reveal |
| Pagination | Custom pagination | — | — |

**Detail page** (`/[locale]/blog/[slug]/page.tsx`): MDX content, related posts, share buttons.
**SEO:** Article JSON-LD, author info, publishedTime
**SSG:** `generateStaticParams` from blog slugs

---

### 6. Contact Page (`/[locale]/contact/page.tsx`)

| Section | Component | Data Source | Animation |
|---------|-----------|-------------|-----------|
| Page Header | `SectionHeader` | i18n | Fade-in |
| Contact Form | Custom form | — | — |
| Contact Info | Cards | Static | Staggered reveal |
| Map | Leaflet (HQ location) | Static coords | — |

**SEO:** ContactPage schema
**SSG:** Fully static (form submits client-side)

---

## Shared Components Specification

### `Navbar` (`components/layout/Navbar.tsx`)
- **Behavior:** Transparent over hero → solid cream on scroll (60px threshold)
- **Desktop:** Logo left, nav links center, language switcher + CTA right
- **Mobile:** Logo left, hamburger right → `MobileMenu` slide-in
- **Links:** Home, Menu, Locations, About, Blog, Contact
- **Animation:** Background opacity transition 0.3s, logo color swap

### `Footer` (`components/layout/Footer.tsx`)
- **Background:** `crust` (#EDE0CC)
- **Sections:** Brand column (logo + tagline), Quick Links, Contact Info, Social Icons
- **Bottom bar:** Copyright + Privacy Policy link
- **Typography:** `caramel` for links, `cocoa` for text

### `HeroSection` (`components/sections/HeroSection.tsx`)
- **Props:** `videoSrc?`, `imageSrc`, `title`, `subtitle`, `ctaText?`, `ctaHref?`
- **Layout:** 100vh, centered text, gradient overlay
- **Video:** Autoplay, muted, loop, poster image fallback
- **Animation:** Title fade-in + slide-up (1s delay), subtitle (1.2s), CTA (1.5s)
- **Scroll indicator:** Bouncing chevron at bottom

### `SectionHeader` (`components/ui/SectionHeader.tsx`)
- **Props:** `title`, `subtitle?`, `cursiveAccent?`, `align?`
- **Typography:** `cursiveAccent` in Sacramento, `title` in Lora serif, `subtitle` in Inter
- **Animation:** Fade-in + slide-up on scroll

### `ProductCard` (`components/cards/ProductCard.tsx`)
- **Props:** `product: { id, name, slug, description, basePrice, images, category }`
- **Layout:** Image (4:3), category badge, name, price
- **Background:** `vanilla`, border `border`, radius 10px
- **Hover:** translateY(-2px) + shadow-card
- **Animation:** Part of staggered grid reveal

### `LocationCard` (`components/cards/LocationCard.tsx`)
- **Props:** `branch: { id, name, address, region, lat, lng }`
- **Layout:** Region badge, name, address, "View on map" link
- **Background:** `white`, border, radius 10px
- **Hover:** border-golden, shadow-soft

### `TestimonialCard` (`components/cards/TestimonialCard.tsx`)
- **Props:** `testimonial: { quote, author, role, avatar? }`
- **Layout:** Quote icon, text, author info
- **Background:** `vanilla`, radius 10px

### `ScrollReveal` (`components/ui/ScrollReveal.tsx`)
- **Props:** `children`, `delay?`, `direction?` (up|left|right), `stagger?`
- **Behavior:** Wraps children, applies GSAP ScrollTrigger on mount
- **Client component** (`"use client"`)

### `ParallaxImage` (`components/ui/ParallaxImage.tsx`)
- **Props:** `src`, `alt`, `speed?` (0.1-0.5)
- **Behavior:** Image moves at different scroll speed via GSAP
- **Uses:** next/image for optimization

---

## GSAP Animation System

### Setup (`lib/gsap.ts`)
```typescript
// Register GSAP plugins once
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
```

### Animation Patterns

| Pattern | Duration | Easing | Trigger |
|---------|----------|--------|---------|
| Section fade-in | 800ms | `power2.out` | top 85% viewport |
| Card stagger | 600ms, 150ms stagger | `power2.out` | top 80% viewport |
| Counter count-up | 2000ms | `power1.inOut` | top 90% viewport |
| Hero entrance | 1000-1200ms | `power3.out` | Immediate (timeline) |
| Parallax | Continuous | linear | scrub: true |
| Navbar bg | 300ms | CSS ease | scroll > 60px |

### Hook: `useScrollReveal.ts`
```typescript
// Attaches ScrollTrigger to a ref
// Options: { y: 40, opacity: 0, duration: 0.8, stagger: 0.15, once: true }
```

### Hook: `useCountUp.ts`
```typescript
// Animates a number from 0 to target on scroll
// Uses gsap.to with snap: { innerText: 1 }
```

### Hook: `useParallax.ts`
```typescript
// Applies parallax movement to a ref
// Uses ScrollTrigger with scrub: true, yPercent offset
```

### Key Animations by Page

**Homepage:**
- Hero: Timeline → title (y:30→0, opacity:0→1), subtitle (delay 0.2), CTA (delay 0.4)
- Featured Products: Staggered cards (0.15s apart)
- Stats: Counter from 0 → target number
- Story: Parallax background image, text paragraphs stagger in
- Testimonials: Fade between cards (auto-rotate 5s)

**Menu:**
- Category switch: Fade out old → fade in new (0.3s)
- Product cards: Stagger reveal per visible category

**Locations:**
- Map pins: Drop-in animation on load
- Store cards: Stagger reveal

**About:**
- Timeline: Scroll-linked progress bar
- Team cards: Stagger reveal (3 per row)
- Values: Scale from 0.9 → 1 + fade in

---

## SEO Strategy

### Meta Tags (per page via `generateMetadata`)
```typescript
// Each page exports generateMetadata():
// - title: "Page | Bakerio — Artisan Bakery"
// - description: Unique per page
// - openGraph: { title, description, images, locale }
// - alternates: { languages: { vi, en } }
// - twitter: { card: "summary_large_image" }
```

### Structured Data (JSON-LD)

| Page | Schema Type |
|------|-------------|
| Homepage | Organization, WebSite, BreadcrumbList |
| Menu | Menu, MenuItem (per product) |
| Locations | LocalBusiness (per branch) |
| About | AboutPage, Person (team) |
| Blog | Article, BlogPosting |
| Contact | ContactPage |

### `robots.ts`
```typescript
// Allow all, sitemap URL, disallow /api/
```

### `sitemap.ts`
```typescript
// Generate entries for all pages × all locales
// Include lastModified, changeFrequency, priority
// Dynamic: blog slugs, product pages (if any)
```

### OG Images
- Static OG images per page in `public/images/og/`
- Format: 1200×630, brand colors, page title overlay

---

## i18n Setup (next-intl)

### Locales: `vi` (default), `en`

### Routing (`i18n/routing.ts`)
```typescript
// pathnames: same structure for both locales
// defaultLocale: "vi"
// localePrefix: "as-needed" (no /vi/ prefix for default)
```

### Message Structure (`messages/vi.json`, `messages/en.json`)
```json
{
  "common": {
    "nav": { "home", "menu", "locations", "about", "blog", "contact" },
    "cta": { "viewMenu", "findStore", "orderNow", "readMore" },
    "footer": { ... }
  },
  "home": {
    "hero": { "title", "subtitle" },
    "featured": { "heading", "subheading" },
    "story": { "heading", "paragraph1", "paragraph2" },
    "stats": { "stores", "products", "customers", "years" },
    "testimonials": { "heading" },
    "newsletter": { "heading", "placeholder", "button" }
  },
  "menu": { "heading", "subheading", "allCategories", "noProducts" },
  "locations": { "heading", "subheading", "viewOnMap", "allRegions" },
  "about": { "hero", "story", "values", "team", "timeline" },
  "blog": { "heading", "readMore", "publishedOn" },
  "contact": { "heading", "form": { "name", "email", "message", "submit" } }
}
```

---

## Performance Strategy

### Static Site Generation (SSG)
- **All pages** use SSG with `revalidate` (ISR):
  - Homepage: `revalidate: 3600` (1 hour)
  - Menu: `revalidate: 1800` (30 min, products change)
  - Locations: `revalidate: 86400` (daily)
  - About, Contact: Fully static (no revalidate)
  - Blog: `generateStaticParams` + `revalidate: 3600`

### Image Optimization
- All images via `next/image` with `sizes` prop
- Hero poster: priority loading, `fetchPriority="high"`
- Product images: lazy loaded, `sizes="(max-width: 768px) 100vw, 33vw"`
- WebP/AVIF auto-conversion via Next.js image optimizer
- Blur placeholder: `placeholder="blur"` with base64 blurDataURL

### Video Optimization
- Hero video: `<video>` with `preload="metadata"`, poster image
- Intersection Observer: only play when visible
- Compressed MP4 (H.264), max 5MB for hero

### Code Splitting
- GSAP loaded only in client components (`"use client"`)
- Leaflet map: dynamic import with `next/dynamic` + `ssr: false`
- Heavy sections: lazy loaded below fold

### Font Loading
- `next/font/google` for Inter, Lora, Sacramento
- `display: "swap"` for all fonts
- Subset: `latin` + `vietnamese`

---

## Implementation Order

### Phase 1: Foundation (Day 1-2)
> Setup project config, design tokens, fonts, base layout

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 1.1 | Install dependencies | `package.json` | — |
| 1.2 | Tailwind config with Bakerio tokens | `src/styles/globals.css` | — |
| 1.3 | Font declarations | `src/lib/fonts.ts` | — |
| 1.4 | GSAP setup + plugin registration | `src/lib/gsap.ts` | 1.1 |
| 1.5 | i18n config (next-intl) | `src/i18n/`, `next.config.ts`, `middleware.ts` | 1.1 |
| 1.6 | Translation files (skeleton) | `src/messages/vi.json`, `src/messages/en.json` | 1.5 |
| 1.7 | Root layout with fonts | `src/app/layout.tsx`, `src/app/[locale]/layout.tsx` | 1.3, 1.5 |
| 1.8 | API client wrapper | `src/lib/api.ts` | — |
| 1.9 | TypeScript types | `src/types/index.ts` | — |

**Dependencies to install:**
```bash
npm install gsap next-intl react-leaflet leaflet
npm install -D @types/leaflet
```

---

### Phase 2: Layout Components (Day 2-3)
> Navbar, Footer, base UI components

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 2.1 | Button component | `src/components/ui/Button.tsx` | 1.2 |
| 2.2 | Badge component | `src/components/ui/Badge.tsx` | 1.2 |
| 2.3 | SectionHeader component | `src/components/ui/SectionHeader.tsx` | 1.2, 1.3 |
| 2.4 | Skeleton component | `src/components/ui/Skeleton.tsx` | 1.2 |
| 2.5 | Navbar (desktop + mobile) | `src/components/layout/Navbar.tsx` | 1.3, 1.6 |
| 2.6 | MobileMenu | `src/components/layout/MobileMenu.tsx` | 2.5 |
| 2.7 | LanguageSwitcher | `src/components/layout/LanguageSwitcher.tsx` | 1.5 |
| 2.8 | Footer | `src/components/layout/Footer.tsx` | 1.6 |
| 2.9 | ScrollReveal wrapper | `src/components/ui/ScrollReveal.tsx` | 1.4 |
| 2.10 | ParallaxImage | `src/components/ui/ParallaxImage.tsx` | 1.4 |

---

### Phase 3: Animation Hooks (Day 3)
> GSAP hooks for reuse across pages

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 3.1 | useScrollReveal hook | `src/hooks/useScrollReveal.ts` | 1.4 |
| 3.2 | useParallax hook | `src/hooks/useParallax.ts` | 1.4 |
| 3.3 | useCountUp hook | `src/hooks/useCountUp.ts` | 1.4 |
| 3.4 | useMediaQuery hook | `src/hooks/useMediaQuery.ts` | — |

---

### Phase 4: Homepage (Day 3-5)
> Build the homepage section by section

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 4.1 | HeroSection (video + text) | `src/components/sections/HeroSection.tsx` | 1.4, 1.3 |
| 4.2 | FeaturedProducts section | `src/components/sections/FeaturedProducts.tsx` | 4.5, 1.8 |
| 4.3 | StorySection (parallax) | `src/components/sections/StorySection.tsx` | 3.2 |
| 4.4 | StatsCounter section | `src/components/sections/StatsCounter.tsx` | 3.3 |
| 4.5 | ProductCard | `src/components/cards/ProductCard.tsx` | 2.2 |
| 4.6 | TestimonialsSection | `src/components/sections/TestimonialsSection.tsx` | 4.7 |
| 4.7 | TestimonialCard | `src/components/cards/TestimonialCard.tsx` | 1.2 |
| 4.8 | LocationsPreview | `src/components/sections/LocationsPreview.tsx` | 4.9 |
| 4.9 | LocationCard | `src/components/cards/LocationCard.tsx` | 2.2 |
| 4.10 | NewsletterSection | `src/components/sections/NewsletterSection.tsx` | 2.1 |
| 4.11 | CTASection | `src/components/sections/CTASection.tsx` | 2.1 |
| 4.12 | Homepage assembly | `src/app/[locale]/page.tsx` | 4.1–4.11 |
| 4.13 | Static data files | `src/data/testimonials.ts`, `src/data/values.ts` | — |

---

### Phase 5: Menu Page (Day 5-6)
> Category filtering + product grid

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 5.1 | Menu page layout | `src/app/[locale]/menu/page.tsx` | 2.3, 4.5 |
| 5.2 | Category tabs/filter | Within menu page | 1.8 |
| 5.3 | Menu page metadata | Within menu page | — |
| 5.4 | Menu translations | Update `messages/*.json` | — |

---

### Phase 6: Locations Page (Day 6-7)
> Map + store cards with region filtering

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 6.1 | Leaflet map component (dynamic) | `src/components/sections/LocationMap.tsx` | 1.1 |
| 6.2 | Locations page layout | `src/app/[locale]/locations/page.tsx` | 4.9, 6.1 |
| 6.3 | Region filter | Within locations page | 1.8 |
| 6.4 | Locations translations | Update `messages/*.json` | — |

---

### Phase 7: About Page (Day 7-8)
> Story, values, team, timeline

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 7.1 | TeamMemberCard | `src/components/cards/TeamMemberCard.tsx` | 1.2 |
| 7.2 | About page layout | `src/app/[locale]/about/page.tsx` | 7.1, 4.1 |
| 7.3 | Team data | `src/data/team.ts` | — |
| 7.4 | Values data | `src/data/values.ts` | — |
| 7.5 | About translations | Update `messages/*.json` | — |

---

### Phase 8: Blog & Contact (Day 8-9)
> Blog listing/detail + contact form

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 8.1 | BlogCard | `src/components/cards/BlogCard.tsx` | 2.2 |
| 8.2 | Blog listing page | `src/app/[locale]/blog/page.tsx` | 8.1 |
| 8.3 | Blog detail page | `src/app/[locale]/blog/[slug]/page.tsx` | — |
| 8.4 | Contact page | `src/app/[locale]/contact/page.tsx` | 2.1 |
| 8.5 | Blog/Contact translations | Update `messages/*.json` | — |

---

### Phase 9: SEO & Polish (Day 9-10)
> Metadata, structured data, sitemap, final animations

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 9.1 | JSON-LD component | `src/components/seo/JsonLd.tsx` | — |
| 9.2 | Per-page generateMetadata | All page files | 9.1 |
| 9.3 | robots.ts | `src/app/robots.ts` | — |
| 9.4 | sitemap.ts | `src/app/sitemap.ts` | — |
| 9.5 | 404 page | `src/app/not-found.tsx` | 1.2 |
| 9.6 | OG images | `public/images/og/` | — |
| 9.7 | Performance audit | — | All |
| 9.8 | Animation polish & timing | All animated components | All |
| 9.9 | Accessibility audit (a11y) | All components | All |
| 9.10 | Final translations review | `messages/*.json` | All |

---

## Configuration Files to Create/Modify

| File | Purpose |
|------|---------|
| `next.config.ts` | i18n plugin, image domains, headers |
| `middleware.ts` | next-intl locale detection middleware |
| `tailwind.config.ts` | Bakerio color tokens, fonts, shadows (Tailwind v4 via CSS) |
| `src/styles/globals.css` | @theme tokens, @layer base styles, CSS custom properties |
| `postcss.config.mjs` | Already exists, no changes needed |
| `tsconfig.json` | Path aliases (`@/` → `src/`) |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "gsap": "^3.12.7",
    "next-intl": "^4.1.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12"
  }
}
```

---

## Key Decisions

1. **SSG over SSR** — Branding site is mostly static; ISR for product/branch data freshness
2. **GSAP over Framer Motion** — Per requirements; better scroll-linked animation control
3. **next-intl over next built-in i18n** — Better DX, type-safe messages, App Router native
4. **Leaflet over Google Maps** — Free, no API key needed, lighter bundle
5. **No CMS for v1** — Blog content as MDX files or static data; add CMS later
6. **Client components only where needed** — Animations, map, form; everything else is RSC
7. **Sacramento for accents only** — Used sparingly in section headers, not body text
