import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Visual screenshot suite — web branding app
 * Captures full-page screenshots of every route for visual review and bug detection.
 * Run with: npx playwright test --project=visual-web
 */

const ROUTES: { name: string; path: string; waitFor?: string }[] = [
  { name: "01-homepage",  path: "/",         waitFor: "h1" },
  { name: "02-menu",      path: "/menu",      waitFor: "[class*='menu'], main, h1" },
  { name: "03-locations", path: "/locations", waitFor: "h1" },
  { name: "04-about",     path: "/about",     waitFor: "h1" },
  { name: "05-blog",      path: "/blog",      waitFor: "h1" },
  { name: "06-contact",   path: "/contact",   waitFor: "h1" },
  // Note: /menu/[slug], /blog/[slug], /this-page-does-not-exist require
  // a running Next.js server (not static export). Run with visual-web-dev project.
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile",  width: 390,  height: 844 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Web — ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`screenshot: ${route.name} @ ${vp.name}`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "networkidle" });

        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: "visible", timeout: 10_000 });
        }

        // Dismiss any cookie banners or overlays
        const closeBtn = page.getByRole("button", { name: /close|dismiss|accept/i });
        if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await closeBtn.click();
        }

        // Scroll to bottom to trigger lazy loads, then back to top
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(400);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);

        const screenshotPath = path.join(
          "e2e/screenshots/web",
          `${route.name}--${vp.name}.png`
        );

        await expect(page).toHaveScreenshot(screenshotPath, {
          fullPage: true,
          animations: "disabled",
          mask: [page.locator("time"), page.locator("[data-dynamic]")],
        });
      });
    }

    test(`no layout overflow @ ${vp.name}`, async ({ page }) => {
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: "networkidle" });

        const overflow = await page.evaluate(() => {
          const bodyWidth = document.body.scrollWidth;
          const viewportWidth = window.innerWidth;
          return { bodyWidth, viewportWidth, overflow: bodyWidth > viewportWidth };
        });

        expect(overflow.overflow, `${route.path} has horizontal overflow: body=${overflow.bodyWidth} viewport=${overflow.viewportWidth}`).toBe(false);
      }
    });

    test(`no broken images @ ${vp.name}`, async ({ page }) => {
      for (const route of ROUTES.slice(0, 5)) {
        await page.goto(route.path, { waitUntil: "networkidle" });

        const brokenImages = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll("img"));
          return imgs
            .filter((img) => !img.complete || img.naturalWidth === 0)
            .map((img) => img.src || img.dataset.src || "(no src)");
        });

        expect(brokenImages, `${route.path} has broken images: ${brokenImages.join(", ")}`).toHaveLength(0);
      }
    });

    test(`focus rings visible on interactive elements @ ${vp.name}`, async ({ page }) => {
      await page.goto("/contact", { waitUntil: "networkidle" });

      // Tab to first input and verify focus is visible
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab"); // skip skip-link

      const focusedEl = page.locator(":focus");
      await expect(focusedEl).toBeVisible();

      // Check the focused element has a visible outline via computed style
      const hasVisibleFocus = await focusedEl.evaluate((el) => {
        const style = window.getComputedStyle(el);
        const outline = style.outline;
        const ring = style.boxShadow;
        return outline !== "none" || ring.includes("0 0 0");
      });
      expect(hasVisibleFocus).toBe(true);
    });

    test(`text contrast check (spot) @ ${vp.name}`, async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Verify h1 is actually visible and rendered (not white on white)
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();

      const contrast = await h1.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return { color: style.color, background: style.backgroundColor };
      });

      // Color and background should not both be white
      const bothWhite = contrast.color === "rgb(255, 255, 255)" &&
                        contrast.background === "rgb(255, 255, 255)";
      expect(bothWhite).toBe(false);
    });
  });
}
