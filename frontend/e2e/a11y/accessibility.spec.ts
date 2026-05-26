import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("web app homepage has no critical a11y violations", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });

  test("order app homepage has no critical a11y violations", async ({ page }) => {
    // Note: The order homepage fetches branches via SSR.
    // This scan runs against the real SSR-rendered state of the page (requires running backend).
    await page.goto("http://localhost:3001/");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });

  test("admin login page has no critical a11y violations", async ({ page }) => {
    await page.goto("http://localhost:3002/login");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });
});
