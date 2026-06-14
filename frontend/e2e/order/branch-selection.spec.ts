import { test, expect } from "@playwright/test";

// NOTE: branch/products/categories READS are PUBLIC (PR #24), so a backend built from current main
// serves REAL branch/product data to the guest (unauthenticated) SSR homepage. The api-client
// only falls back to MOCK fixtures if the backend is unreachable or running a STALE build that
// predates PR #24. The name assertions below assume a current backend; navigation, structure,
// and keyboard assertions remain valid regardless.

/**
 * Branch Selection Flow — Order App Homepage
 *
 * The homepage is a Server Component that fetches branches via SSR.
 * page.route() cannot intercept SSR fetches (they happen on the Node server).
 * These tests verify observable UI behavior regardless of backend availability.
 */

import { fetchAll } from "../helpers/fetchAll";

test.describe("Branch Selection — Homepage", () => {
  test("renders the branch selection heading and ordering modes", async ({ page, request }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Where shall\s*we bake for you\?/i })).toBeVisible();
    await expect(page.getByRole("main").getByText("Pickup").first()).toBeVisible();
    
    // Assert real branch count and count text
    const branchesData = await fetchAll('branch', request);
    await expect(page.locator("main button")).toHaveCount(branchesData.length);
    await expect(page.getByText(`${branchesData.length} open`)).toBeVisible();
  });

  // NOTE: The order home page fetches branches in an SSR server component and getBranches()
  // falls back to mock data on error, so the "couldn't load branch availability" error path is
  // not reachable via Playwright page.route. It is covered by the unit test apps/order/src/app/page.test.tsx.

  test("branch cards display name, address, and region", async ({ page }) => {
    await page.goto("/");

    const branchButtons = page.locator("main button");
    await expect(branchButtons).toHaveCount(3);

const firstBranch = branchesData[0];
// Each card has a heading (name), address text, and region badge
await expect(page.getByText(firstBranch.name)).toBeVisible();
await expect(page.getByText(firstBranch.address)).toBeVisible();
    
    // Assert derived region tag instead of static "Open" text
    await expect(firstBranch.getByText(/Coffee bar|Flagship/).first()).toBeVisible();
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
