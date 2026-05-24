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

test.describe("Admin — Branches Management", () => {
  test("branches page loads and shows data", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByText("Bakerio Quận 1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bakerio Hoàn Kiếm")).toBeVisible();
  });

  test("create new branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByRole("button", { name: /add branch/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add branch/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("dialog").locator("input").first().fill("Bakerio Phú Nhuận");
    await page.getByRole("dialog").locator("input").nth(1).fill("100 Phan Xích Long");
    await page.getByRole("dialog").locator("select").selectOption("south");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created|success/i)).toBeVisible({ timeout: 10000 });
  });

  test.skip("edit branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByText("Bakerio Quận 1")).toBeVisible({ timeout: 10000 });

    // Click the first edit (pencil) icon button in the table
    await page.locator("table button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input").first();
    await nameInput.clear();
    await nameInput.fill("Bakerio District 1");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch updated|success/i)).toBeVisible({ timeout: 10000 });
  });

  test.skip("toggle branch status", async () => {
    // TODO: implement status toggle UI
  });
});
