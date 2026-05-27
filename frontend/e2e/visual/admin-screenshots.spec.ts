import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Visual screenshot suite — admin app
 * Run with: npx playwright test --project=visual-admin
 */

const PUBLIC_ROUTES: { name: string; path: string; waitFor?: string }[] = [
  { name: "01-login", path: "/login", waitFor: "main" },
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
          { fullPage: true, animations: "disabled" }
        );
      });
    }

    for (const route of DASHBOARD_ROUTES) {
      test(`screenshot: ${route.name} @ ${vp.name}`, async ({ page }) => {
        // Inject mock auth so the dashboard doesn't redirect to login
        await page.goto("/login", { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
          localStorage.setItem("admin_token", "mock-token-for-visual-testing");
          localStorage.setItem("admin_user", JSON.stringify({
            id: "mock-admin-1",
            name: "Test Admin",
            role: "superadmin",
          }));
        });

        await page.goto(route.path, { waitUntil: "networkidle" });
        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: "visible", timeout: 10_000 });
        }
        // Wait for any data-fetching skeletons to resolve
        await page.waitForTimeout(800);

        await expect(page).toHaveScreenshot(
          path.join("e2e/screenshots/admin", `${route.name}--${vp.name}.png`),
          { fullPage: true, animations: "disabled" }
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
