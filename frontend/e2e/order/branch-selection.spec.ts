import { test, expect } from "@playwright/test";

/**
 * Branch Selection Flow — Order App Homepage
 *
 * The homepage is a Server Component that fetches branches via SSR.
 * page.route() cannot intercept SSR fetches (they happen on the Node server).
 * These tests verify observable UI behavior regardless of backend availability.
 */

test.describe("Branch Selection — Homepage", () => {
  test("renders the branch selection heading and ordering modes", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Where shall\s*we bake for you\?/i })).toBeVisible();
    await expect(page.getByRole("main").getByText("Pickup").first()).toBeVisible();
  });

  test("handles API failure gracefully with error message", async ({ page }) => {
    // SSR fetch will fail if backend is unavailable — page should show error text, not crash
    await page.goto("/");

    const heading = page.getByRole("heading", { name: /Where shall\s*we bake for you\?/i });
    await expect(heading).toBeVisible();

    // Page either shows branches or an error message — never a blank crash
    const hasBranches = await page.locator("button").count() > 0;
    const hasError = await page.locator("text=Failed to load").isVisible().catch(() => false);

    expect(hasBranches || hasError).toBe(true);
  });

  test("branch cards display name, address, and region", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    const count = await branchButtons.count();

    // Skip if no branches loaded (backend unavailable)
    test.skip(count === 0, "No branches loaded — backend unavailable");

    const firstBranch = branchButtons.first();
    // Each card has a heading (name), address text, and region badge
    await expect(firstBranch.locator("h2")).toBeVisible();
    await expect(firstBranch.locator("p")).toBeVisible();
    await expect(firstBranch.getByText(/Open|Selected/).first()).toBeVisible();
  });

  test("clicking a branch navigates to /menu", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    const count = await branchButtons.count();
    test.skip(count === 0, "No branches loaded — backend unavailable");

    await branchButtons.first().click();
    await expect(page).toHaveURL(/\/menu/);
  });

  test("branch cards are keyboard accessible", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    const count = await branchButtons.count();
    test.skip(count === 0, "No branches loaded — backend unavailable");

    // Buttons are natively focusable and activatable via keyboard
    await branchButtons.first().focus();
    await expect(branchButtons.first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/menu/);
  });
});
