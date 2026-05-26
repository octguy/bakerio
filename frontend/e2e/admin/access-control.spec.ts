import { test, expect } from "@playwright/test";

test.describe("Admin — Access Control", () => {
  test("unauthenticated request to dashboard redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated request to branches redirects to login", async ({ page }) => {
    await page.goto("/branches");
    await expect(page).toHaveURL(/\/login/);
  });

  test("customer login is rejected from dashboard access", async ({ page }) => {
    const email = process.env.E2E_CUSTOMER_EMAIL;
    const password = process.env.E2E_CUSTOMER_PASSWORD;

    expect(email, "set E2E_CUSTOMER_EMAIL to run").toBeDefined();
    expect(password, "set E2E_CUSTOMER_PASSWORD to run").toBeDefined();
    expect(email, "set E2E_CUSTOMER_EMAIL to run").not.toBe("");
    expect(password, "set E2E_CUSTOMER_PASSWORD to run").not.toBe("");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Since they are a customer (not staff), they should be rejected from the admin dashboard
    // and see an error or remain on the login page.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|error|denied|unauthorized|forbidden/i)).toBeVisible();
  });
});
