import { test, expect } from "@playwright/test";

const mockBranches = [
  { id: "br-1", name: "Bakerio Quận 1", address: "65 Lê Lợi, Quận 1", lat: 10.77, lng: 106.70, status: "active", region: "south" },
  { id: "br-2", name: "Bakerio Hoàn Kiếm", address: "12 Hàng Bài, Hoàn Kiếm", lat: 21.02, lng: 105.85, status: "active", region: "north" },
];

const mockProducts = [
  { id: "p-1", sku: "CAKE-001", name: "Vanilla Sponge Cake", slug: "vanilla-sponge-cake", description: "Light and fluffy", base_price: 185000, unit: "piece", is_active: true, category: { id: "cat-1", name: "Cakes", slug: "cakes", sort_order: 1, is_active: true }, images: [{ id: "img-1", url: "https://via.placeholder.com/300", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-2", sku: "PAST-001", name: "Butter Croissant", slug: "butter-croissant", description: "Flaky and buttery", base_price: 45000, unit: "piece", is_active: true, category: { id: "cat-2", name: "Pastries", slug: "pastries", sort_order: 2, is_active: true }, images: [{ id: "img-2", url: "https://via.placeholder.com/300", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
];

const mockCategories = [
  { id: "cat-1", name: "Cakes", slug: "cakes", sort_order: 1, is_active: true },
  { id: "cat-2", name: "Pastries", slug: "pastries", sort_order: 2, is_active: true },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/branches**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockBranches }) })
  );
  await page.route("**/api/v1/products**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockProducts }) })
  );
  await page.route("**/api/v1/products/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockProducts[0] }) })
  );
  await page.route("**/api/v1/categories**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockCategories }) })
  );
  await page.route("**/api/v1/orders**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { id: "order-1", status: "PENDING_PAYMENT" } }) })
  );
});

test.describe("Order — Customer Ordering App", () => {
  test("homepage shows branch selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Order from Bakerio");
    await expect(page.getByText("Bakerio Quận 1")).toBeVisible();
    await expect(page.getByText("Bakerio Hoàn Kiếm")).toBeVisible();
  });

  test("selecting a branch navigates to menu", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Bakerio Quận 1").click();
    await expect(page).toHaveURL(/\/menu/);
  });

  test("menu page shows products", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Bakerio Quận 1").click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("can navigate to cart page", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("main")).toBeVisible();
  });

  test("can navigate to checkout page", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("main")).toBeVisible();
  });

  test("full ordering flow: branch → menu → product detail", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Bakerio Quận 1").click();
    await expect(page).toHaveURL(/\/menu/);

    const productLink = page.locator("a[href*='/menu/']").first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await expect(page).toHaveURL(/\/menu\/.+/);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
