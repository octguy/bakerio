# Bakerio Branding Website — QA Test Report

**Date:** 2026-05-19  
**Tester:** Automated QA (Destructive Testing)  
**Environment:** Next.js 16.2.6, localhost:3050  
**Build:** Production (.next/ pre-built)

---

## Summary

| Metric | Result |
|--------|--------|
| Pages Tested | 9 |
| Passed | 6 |
| Failed | 3 (critical) |
| Warnings | 5 |

**Verdict: ❌ FAIL — Critical broken links and missing pages**

---

## Route Status Codes

| Route | Status | Expected | Result |
|-------|--------|----------|--------|
| `/` | 200 | 200 | ✅ PASS |
| `/menu` | 200 | 200 | ✅ PASS |
| `/locations` | 200 | 200 | ✅ PASS |
| `/about` | 200 | 200 | ✅ PASS |
| `/blog` | 200 | 200 | ✅ PASS |
| `/contact` | 200 | 200 | ✅ PASS |
| `/not-a-page` | 404 | 404 | ✅ PASS |
| `/sitemap.xml` | 200 | 200 | ✅ PASS |
| `/robots.txt` | 200 | 200 | ✅ PASS |

---

## 🔴 Critical Bugs

### BUG-001: All blog detail pages return 404

**Severity:** Critical  
**Steps:** Click any blog post card on `/blog`  
**Expected:** Blog post detail page renders  
**Actual:** 404 Not Found  

Affected URLs:
- `/blog/the-art-of-sourdough` → 404
- `/blog/sourcing-vanilla-from-madagascar` → 404
- `/blog/holiday-collection-2024` → 404
- `/blog/zero-waste-bakery` → 404

**Impact:** Blog is completely non-functional. Users see dead links.

### BUG-002: /careers page linked but does not exist

**Severity:** High  
**Location:** Footer navigation on homepage  
**Expected:** Careers page renders  
**Actual:** `/careers` → 404  

### BUG-003: /order page linked but does not exist

**Severity:** High  
**Location:** CTA button on homepage  
**Expected:** Order page renders  
**Actual:** `/order` → 404  

---

## 🟡 Warnings

### WARN-001: Duplicate "Bakerio" in page titles

Multiple pages have `"Page | Bakerio | Bakerio"` pattern:
- `/menu` → "Menu | Bakerio | Bakerio"
- `/locations` → "Locations | Bakerio | Bakerio"
- `/about` → "About | Bakerio | Bakerio"
- `/contact` → "Contact | Bakerio | Bakerio"

**Impact:** Looks unprofessional, wastes title tag space for SEO.

### WARN-002: All pages share identical meta description

Every page uses: *"Artisan cakes, pastries, and bread — crafted with love, served with warmth. 10+ locations in Ho Chi Minh City."*

**Impact:** Poor SEO — Google may show generic snippets for all pages.

### WARN-003: Missing og:image meta tag

No Open Graph image is defined on any page.

**Impact:** Social media shares (Facebook, Twitter, Slack) will have no preview image.

### WARN-004: No security headers

Missing headers:
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `Content-Security-Policy`

**Impact:** Vulnerable to clickjacking, MIME sniffing attacks.

### WARN-005: Sitemap references bakerio.vn but no canonical URL set

Sitemap uses `https://bakerio.vn` as base URL but pages don't have `<link rel="canonical">` tags verified.

---

## ✅ Passing Checks

| Check | Status |
|-------|--------|
| Homepage hero text renders | ✅ |
| Product cards on homepage | ✅ |
| Menu category tabs present | ✅ |
| Location cards render | ✅ |
| About page: team + values | ✅ |
| Blog post cards render | ✅ |
| Contact form inputs exist | ✅ |
| 404 page renders correctly | ✅ |
| All images have alt attributes | ✅ |
| Image optimization endpoint works | ✅ |
| Response times < 10ms (all pages) | ✅ |
| robots.txt valid | ✅ |
| sitemap.xml valid XML | ✅ |
| Navigation links present | ✅ |
| OG title/description/locale set | ✅ |

---

## Performance

| Route | Response Time |
|-------|--------------|
| `/` | 6ms |
| `/menu` | 6ms |
| `/locations` | 6ms |
| `/about` | 5ms |
| `/blog` | 7ms |
| `/contact` | 5ms |

All pages respond in under 10ms (server-side). Excellent.

---

## Recommendations

1. **P0:** Fix blog `[slug]` dynamic route — likely missing `generateStaticParams()` or route file
2. **P0:** Either create `/careers` and `/order` pages or remove the dead links
3. **P1:** Fix duplicate "Bakerio" in title template (likely `metadata.title.template` issue)
4. **P1:** Add unique meta descriptions per page
5. **P2:** Add `og:image` to all pages
6. **P2:** Add security headers via `next.config.js` headers config
7. **P3:** Add `<link rel="canonical">` tags
