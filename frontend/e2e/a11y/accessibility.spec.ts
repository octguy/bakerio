import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("web app homepage has no critical a11y violations", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    // Wait for meaningful content to be visible (e.g. heading "Every bite tells a story")
    await expect(page.locator("h1")).toContainText(/Every\s+bite tells\s+a story\./i, { timeout: 10000 });

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });

  test("order app homepage has no critical a11y violations", async ({ page }) => {
    // Note: The order homepage fetches branches via SSR.
    // This scan runs against the real SSR-rendered state of the page (requires running backend).
    await page.goto("http://localhost:3001/");
    // Wait for meaningful content to be visible (e.g. heading "Where shall we bake for you?")
    await expect(page.getByRole("heading", { name: /Where shall\s*we bake for you\?/i })).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });

  test("admin login page has no critical a11y violations", async ({ page }) => {
    await page.goto("http://localhost:3002/login");
    // Wait for meaningful content to be visible (e.g. heading "Welcome back, baker.")
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });
});
