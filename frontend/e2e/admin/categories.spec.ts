import { test, expect } from "@playwright/test";

const mockCategories = {
  data: [
    { id: "cat-1", name: "Cakes", slug: "cakes", parent_id: null, sort_order: 1, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    { id: "cat-2", name: "Pastries", slug: "pastries", parent_id: null, sort_order: 2, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { access_token: "mock-token" } }) })
  );

  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@bakerio.vn");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');

  await page.route("**/api/v1/categories**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockCategories) });
    } else {
      route.continue();
    }
  });
});

test.describe("Admin — Categories CRUD", () => {
  test("displays categories in the data table", async ({ page }) => {
    await page.goto("/categories");

    await expect(page.getByText("Cakes")).toBeVisible();
    await expect(page.getByText("Pastries")).toBeVisible();
  });

  test("creates a new category", async ({ page }) => {
    const newCategory = { id: "cat-3", name: "Bread", slug: "bread", parent_id: null, sort_order: 3, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

    await page.route("**/api/v1/categories", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: newCategory }) });
      } else {
        route.continue();
      }
    });

    await page.goto("/categories");
    await page.getByRole("button", { name: /add category/i }).click();
    await page.getByLabel(/name/i).fill("Bread");
    await page.getByRole("button", { name: /submit|save|create/i }).click();

    await expect(page.getByText("Bread").or(page.getByText(/success/i))).toBeVisible();
  });

  test("edits an existing category", async ({ page }) => {
    const updated = { ...mockCategories.data[0], name: "Premium Cakes", updated_at: "2026-02-01T00:00:00Z" };

    await page.route("**/api/v1/categories/cat-1", (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: updated }) });
      } else if (route.request().method() === "GET") {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockCategories.data[0] }) });
      } else {
        route.continue();
      }
    });

    await page.goto("/categories");
    await page.getByRole("row", { name: /Cakes/i }).getByRole("button", { name: /edit/i }).click();
    await page.getByLabel(/name/i).clear();
    await page.getByLabel(/name/i).fill("Premium Cakes");
    await page.getByRole("button", { name: /submit|save|update/i }).click();

    // After mutation, refetch returns updated list
    await page.route("**/api/v1/categories**", (route) => {
      if (route.request().method() === "GET") {
        const updatedList = { data: [updated, mockCategories.data[1]] };
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(updatedList) });
      } else {
        route.continue();
      }
    });

    await expect(page.getByText("Premium Cakes")).toBeVisible();
  });

  test("deletes a category", async ({ page }) => {
    await page.route("**/api/v1/categories/cat-1", (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: null }) });
      } else {
        route.continue();
      }
    });

    await page.goto("/categories");
    await page.getByRole("row", { name: /Cakes/i }).getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: /confirm|yes|delete/i }).click();

    // After deletion, refetch returns list without deleted item
    await page.route("**/api/v1/categories**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [mockCategories.data[1]] }) });
      } else {
        route.continue();
      }
    });

    await expect(page.getByText("Cakes")).not.toBeVisible();
  });
});
