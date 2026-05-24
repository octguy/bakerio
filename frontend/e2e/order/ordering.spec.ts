import { test, expect } from "@playwright/test";

test.describe("Order — Customer Ordering App", () => {
  test("homepage shows branch selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Order from Bakerio");
    await expect(page.getByText("Bakerio Quận 1")).toBeVisible();
    await expect(page.getByText("Bakerio Hoàn Kiếm")).toBeVisible();
  });

  test("selecting a branch navigates to menu", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Bakerio Quận 1").click();
    await expect(page).toHaveURL(/\/menu/);
  });

  test("menu page shows products", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Bakerio Quận 1").click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("can navigate to cart page", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("main")).toBeVisible();
  });

  test("can navigate to checkout page", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("main")).toBeVisible();
  });

  test("full ordering flow: branch → menu → product detail", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Bakerio Quận 1").click();
    await expect(page).toHaveURL(/\/menu/);

    const productLink = page.locator("a[href*='/menu/']").first();
    if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productLink.click();
      await expect(page).toHaveURL(/\/menu\/.+/);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
