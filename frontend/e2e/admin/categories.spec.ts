import { test, expect } from "@playwright/test";

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("superadmin@bakerio.com");
  await page.getByLabel("Password").fill("123456");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.beforeEach(async ({ page }) => {
  await adminLogin(page);
});

test.describe("Admin — Categories CRUD", () => {
  test("displays categories in the data table", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText("Cakes", { exact: true })).toBeVisible();
    await expect(page.locator("table").getByText("Pastries", { exact: true })).toBeVisible();
  });

  test("creates a new category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("button", { name: /add category/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add category/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("dialog").locator("input").first().fill("Bread");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Category created")).toBeVisible({ timeout: 10000 });
  });

  test("edits an existing category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Click the first edit (pencil) icon button in the table row actions
    const firstRow = page.locator("tbody tr").first();
    await firstRow.locator("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input").first();
    await nameInput.fill("Premium Cakes");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Category updated")).toBeVisible({ timeout: 10000 });
  });

  test("deletes a category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Click the delete (trash) icon button — second button in first row's actions
    const firstRow = page.locator("tbody tr").first();
    await firstRow.locator("button").nth(1).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /delete/i }).last().click();

    await expect(page.getByText("Category deleted")).toBeVisible({ timeout: 10000 });
  });
});
