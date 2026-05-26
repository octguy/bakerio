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

  // NOTE: The order home page fetches branches in an SSR server component and getBranches()
  // falls back to mock data on error, so the "couldn't load branch availability" error path is
  // not reachable via Playwright page.route. It is covered by the unit test apps/order/src/app/page.test.tsx.

  test("branch cards display name, address, and region", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    await expect(branchButtons).not.toHaveCount(0);

    const firstBranch = branchButtons.first();
    // Each card has a heading (name), address text, and region badge
    await expect(firstBranch.locator("h2")).toBeVisible();
    await expect(firstBranch.locator("p")).toBeVisible();
    await expect(firstBranch.getByText(/Open|Selected/).first()).toBeVisible();
  });

  test("clicking a branch navigates to /menu", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    await expect(branchButtons).not.toHaveCount(0);

    await branchButtons.first().click();
    await expect(page).toHaveURL(/\/menu/);
  });

  test("branch cards are keyboard accessible", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    await expect(branchButtons).not.toHaveCount(0);

    // Buttons are natively focusable and activatable via keyboard
    await branchButtons.first().focus();
    await expect(branchButtons.first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/menu/);
  });
});
