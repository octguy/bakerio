import { test, expect } from "@playwright/test";

const RUN = Date.now();

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

test.describe("Admin — Users Management", () => {
  test("users page loads with heading", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: /staff/i })).toBeVisible({ timeout: 10000 });

    // Assert that the staff list container renders at least one real user row (e.g. Super Admin)
    const staffContainer = page.locator("div.rounded-lg.border.bg-white");
    await expect(staffContainer.getByText("Super Admin").first()).toBeVisible({ timeout: 10000 });
  });

  // NOTE: backend exposes no deleteUser endpoint (frozen), so created staff cannot be cleaned up; use a unique name/email per run so rows are identifiable and never collide.
  test("create staff user via dialog form", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("button", { name: /add user/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add user/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const dialog = page.getByRole("dialog");
    const inputs = dialog.locator("input");
    await inputs.nth(0).fill(`E2E Staff ${RUN}`);       // Full Name
    await inputs.nth(1).fill(`staff-${RUN}@bakerio.vn`); // Email
    await inputs.nth(2).fill("secure123");           // Password
    await dialog.locator("select").selectOption("product_manager"); // Role (non-branch-scoped)

    await page.getByRole("button", { name: /create user/i }).click();
    await expect(page.getByText("User created")).toBeVisible({ timeout: 10000 });

    // Assert that the newly created user is visible in the staff list
    const staffContainer = page.locator("div.rounded-lg.border.bg-white");
    await expect(staffContainer.getByText(`E2E Staff ${RUN}`).first()).toBeVisible({ timeout: 10000 });
  });

  test("create user with invalid data shows validation errors", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("button", { name: /add user/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add user/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /create user/i }).click();

    await expect(page.getByText(/valid email required/i)).toBeVisible();
    await expect(page.getByText(/name required/i)).toBeVisible();
    await expect(page.getByText(/min 6 characters/i)).toBeVisible();
    await expect(page.getByText(/role required/i)).toBeVisible();
  });
});
