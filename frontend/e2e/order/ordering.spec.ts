import { test, expect } from "@playwright/test";

test.describe("Order — Customer Ordering App", () => {
  test("homepage shows branch selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Where shall\s*we bake for you\?/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bakerio Quận 1/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bakerio Hoàn Kiếm/ })).toBeVisible();
  });

  test("selecting a branch navigates to menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Bakerio Quận 1/ }).click();
    await expect(page).toHaveURL(/\/menu/);
  });

  test("menu page shows products", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Bakerio Quận 1/ }).click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.locator("a[href*='/menu/'] h3").first()).toBeVisible();
  });

  test("cart requires auth -> redirects to login", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login/);
  });

  test("checkout requires auth -> redirects to login", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
  });

  test("full ordering flow: branch → menu → product detail", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Bakerio Quận 1/ }).click();
    await expect(page).toHaveURL(/\/menu/);

    const productLink = page.locator("a[href*='/menu/']").first();
    await productLink.click();
    await expect(page).toHaveURL(/\/menu\/.+/);
    await expect(page.locator("main")).toBeVisible();
  });
});
