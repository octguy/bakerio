import { test, expect } from "@playwright/test";

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("superadmin@bakerio.com");
  await page.getByLabel("Password", { exact: true }).fill("123456");
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
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created|success/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText("Bakerio Phú Nhuận").first()).toBeVisible({ timeout: 10000 });
  });

  test("edit branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByText("Bakerio Quận 1")).toBeVisible({ timeout: 10000 });

    // Click the edit pencil icon button of the first row in the table body
    await page.locator("table tbody tr").first().locator("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Branch" })).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input").first();
    await nameInput.clear();
    await nameInput.fill("Bakerio Quận 1 Edited");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Branch updated")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bakerio Quận 1 Edited").first()).toBeVisible();
  });
});
