import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const mockBranches = [
  { id: "br-1", name: "Bakerio Quận 1", address: "65 Lê Lợi, Quận 1", status: "active", region: "south" },
];

test.describe("Accessibility", () => {
  test("web app homepage has no critical a11y violations", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });

  test("order app homepage has no critical a11y violations", async ({ page }) => {
    await page.route("**/api/v1/branches**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockBranches }) })
    );
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
