import { test, expect } from "@playwright/test";

const mockBranches = {
  data: [
    { id: "br-1", name: "Bakerio Saigon Centre", address: "65 Lê Lợi, District 1", lat: 10.7731, lng: 106.7009, status: "active", created_at: "2026-01-01T00:00:00Z" },
    { id: "br-2", name: "Bakerio Thảo Điền", address: "12 Nguyễn Đăng Giai", lat: 10.8031, lng: 106.7351, status: "active", created_at: "2026-01-01T00:00:00Z" },
  ],
};

const mockUser = { user: { id: "u-1", email: "admin@bakerio.vn", full_name: "Admin", roles: ["admin"] } };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUser) })
  );
  await page.route("**/api/v1/branch", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockBranches) });
    }
    return route.continue();
  });
});

test.describe("Admin — Branches Management", () => {
  test("branches page loads and shows data", async ({ page }) => {
    await page.goto("/branches");

    await expect(page.getByText("Bakerio Saigon Centre")).toBeVisible();
    await expect(page.getByText("Bakerio Thảo Điền")).toBeVisible();
  });

  test("create new branch", async ({ page }) => {
    await page.route("**/api/v1/branch", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ data: { id: "br-3", name: "Bakerio Phú Nhuận", address: "100 Phan Xích Long", lat: 10.8, lng: 106.68, status: "active", created_at: "2026-05-20T00:00:00Z" } }),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockBranches) });
    });

    await page.goto("/branches");
    await page.getByRole("button", { name: /add branch/i }).click();

    await page.getByLabel(/name/i).fill("Bakerio Phú Nhuận");
    await page.getByLabel(/address/i).fill("100 Phan Xích Long");
    await page.getByLabel(/region/i).selectOption("south");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created/i)).toBeVisible();
  });

  test("edit branch", async ({ page }) => {
    await page.route("**/api/v1/branch/br-1", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { ...mockBranches.data[0], name: "Bakerio District 1" } }),
        });
      }
      return route.continue();
    });

    await page.goto("/branches");
    await page.getByRole("button", { name: /edit/i }).first().click();

    await page.getByLabel(/name/i).clear();
    await page.getByLabel(/name/i).fill("Bakerio District 1");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch updated/i)).toBeVisible();
  });

  test("toggle branch status", async ({ page }) => {
    await page.route("**/api/v1/branch/br-1/status", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { ...mockBranches.data[0], status: "inactive" } }),
        });
      }
      return route.continue();
    });

    await page.goto("/branches");

    const statusBadge = page.getByText("active").first();
    await statusBadge.click();

    await expect(page.getByText("inactive")).toBeVisible();
  });
});
