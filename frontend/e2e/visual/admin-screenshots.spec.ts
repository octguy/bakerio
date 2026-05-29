import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Visual screenshot suite — admin app
 * Run with: npx playwright test --project=visual-admin
 */

const PUBLIC_ROUTES: { name: string; path: string; waitFor?: string }[] = [
  { name: "01-login", path: "/login", waitFor: "form" },
];

const DASHBOARD_ROUTES: { name: string; path: string; waitFor?: string }[] = [
  { name: "02-dashboard",  path: "/",           waitFor: "main" },
  { name: "03-orders",     path: "/orders",      waitFor: "main" },
  { name: "04-kitchen",    path: "/kitchen",     waitFor: "main" },
  { name: "05-branches",   path: "/branches",    waitFor: "main" },
  { name: "06-categories", path: "/categories",  waitFor: "main" },
  { name: "07-users",      path: "/users",       waitFor: "main" },
  { name: "08-inventory",  path: "/inventory",   waitFor: "main" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet",  width: 768,  height: 1024 },
];

async function loginAsAdmin(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth", {
    data: {
      action: "login",
      email: process.env.E2E_ADMIN_EMAIL,
      password: process.env.E2E_ADMIN_PASSWORD,
    },
  });

  expect(res.ok(), `admin visual auth failed: ${res.status()} ${await res.text()}`).toBe(true);
}

for (const vp of VIEWPORTS) {
  test.describe(`Admin — ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of PUBLIC_ROUTES) {
      test(`screenshot: ${route.name} @ ${vp.name}`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "networkidle" });
        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: "visible", timeout: 10_000 });
        }
        await page.waitForTimeout(400);

        await expect(page).toHaveScreenshot(
          path.join("e2e/screenshots/admin", `${route.name}--${vp.name}.png`),
          { fullPage: true, animations: "disabled", maxDiffPixels: 100 }
        );
      });
    }

    for (const route of DASHBOARD_ROUTES) {
      test(`screenshot: ${route.name} @ ${vp.name}`, async ({ page }) => {
        await loginAsAdmin(page);

        await page.goto(route.path, { waitUntil: "networkidle" });
        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: "visible", timeout: 10_000 });
        }
        // Wait for any data-fetching skeletons to resolve
        await page.waitForTimeout(800);

        await expect(page).toHaveScreenshot(
          path.join("e2e/screenshots/admin", `${route.name}--${vp.name}.png`),
          { fullPage: true, animations: "disabled", maxDiffPixels: 100 }
        );
      });
    }

    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => ({
        overflow: document.body.scrollWidth > window.innerWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(overflow.overflow, `Login page has horizontal overflow: ${overflow.bodyWidth}px > ${overflow.viewportWidth}px`).toBe(false);
    });

    test(`toast container has aria-live @ ${vp.name}`, async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // The toast container should have aria-live for screen readers
      // This is a regression guard for the fix in toast.tsx
      const toastContainer = page.locator("[aria-live]");
      const count = await toastContainer.count();
      expect(count, "Expected at least one aria-live region (toast container) on page").toBeGreaterThan(0);
    });
  });
}
