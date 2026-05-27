import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Visual screenshot suite — order app (mock mode, no backend needed)
 * Run with: npx playwright test --project=visual-order
 */

const ROUTES: { name: string; path: string; waitFor?: string }[] = [
  { name: "01-branch-select", path: "/",         waitFor: "h1" },
  { name: "02-login",         path: "/login",     waitFor: "main" },
  { name: "03-register",      path: "/register",  waitFor: "main" },
];

// Routes that need a branch selected (set via localStorage)
const AUTHED_ROUTES: { name: string; path: string; waitFor?: string }[] = [
  { name: "04-menu",     path: "/menu",          waitFor: "main" },
  { name: "05-cart",     path: "/cart",          waitFor: "main" },
  { name: "06-profile",  path: "/profile",       waitFor: "main" },
  { name: "07-orders",   path: "/orders",        waitFor: "main" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile",  width: 390,  height: 844 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Order — ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // Public routes (no auth needed)
    for (const route of ROUTES) {
      test(`screenshot: ${route.name} @ ${vp.name}`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "networkidle" });
        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: "visible", timeout: 10_000 });
        }
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(
          path.join("e2e/screenshots/order", `${route.name}--${vp.name}.png`),
          { fullPage: true, animations: "disabled" }
        );
      });
    }

    // Routes needing branch + auth context injected via localStorage
    for (const route of AUTHED_ROUTES) {
      test(`screenshot: ${route.name} @ ${vp.name}`, async ({ page }) => {
        // Inject a mock branch selection and auth token so the app doesn't redirect
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
          localStorage.setItem("selected_branch", JSON.stringify({ id: "mock-branch-1", name: "District 1" }));
          localStorage.setItem("auth_token", "mock-token-for-visual-testing");
        });

        await page.goto(route.path, { waitUntil: "networkidle" });
        if (route.waitFor) {
          await page.locator(route.waitFor).first().waitFor({ state: "visible", timeout: 10_000 });
        }
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(
          path.join("e2e/screenshots/order", `${route.name}--${vp.name}.png`),
          { fullPage: true, animations: "disabled" }
        );
      });
    }

    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      for (const route of [...ROUTES, ...AUTHED_ROUTES]) {
        await page.goto(route.path, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => ({
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          overflow: document.body.scrollWidth > window.innerWidth,
        }));
        expect(overflow.overflow, `${route.path} has horizontal overflow`).toBe(false);
      }
    });
  });
}
