import { test, expect } from "@playwright/test";

const mockAuthUser = {
  user: { id: "user-1", email: "admin@bakerio.vn", full_name: "Admin User", roles: ["admin"] },
};

const mockCreateUser = {
  data: { id: "user-1", email: "staff@bakerio.vn", full_name: "Staff Member", role: "staff", branch_id: "br-1", created_at: "2026-05-20T00:00:00Z" },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockAuthUser) })
  );
});

test.describe("Admin — Users Management", () => {
  test("users page loads with heading", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  });

  test("create staff user via dialog form", async ({ page }) => {
    await page.route("**/api/v1/users", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(mockCreateUser) })
    );

    await page.goto("/users");
    await page.getByRole("button", { name: /add user/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel(/full name/i).fill("Staff Member");
    await page.getByLabel(/email/i).fill("staff@bakerio.vn");
    await page.getByLabel(/password/i).fill("secure123");
    await page.getByLabel(/role/i).selectOption("staff");

    await page.getByRole("button", { name: /create user/i }).click();
    await expect(page.getByText("User created")).toBeVisible();
  });

  test("create user with invalid data shows validation errors", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: /add user/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /create user/i }).click();

    await expect(page.getByText(/valid email required/i)).toBeVisible();
    await expect(page.getByText(/name required/i)).toBeVisible();
    await expect(page.getByText(/min 6 characters/i)).toBeVisible();
    await expect(page.getByText(/role required/i)).toBeVisible();
  });
});
