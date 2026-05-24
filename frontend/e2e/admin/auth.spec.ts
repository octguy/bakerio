import { test, expect } from "@playwright/test";

test.describe("Admin — Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("superadmin@bakerio.com");
    await page.getByLabel("Password").fill("123456");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("login with invalid credentials shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText(/invalid|error|denied/i)).toBeVisible({ timeout: 10000 });
  });

  test("login form shows validation errors when fields are empty", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign In" }).click();

    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveJSProperty("validity.valueMissing", true);
  });

  test("logout redirects to login page", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel("Email").fill("superadmin@bakerio.com");
    await page.getByLabel("Password").fill("123456");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Verify dashboard loaded (use heading to be specific)
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
