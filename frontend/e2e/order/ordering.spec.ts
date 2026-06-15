import { test, expect } from "@playwright/test";
import { fetchAll } from "../helpers/fetchAll";

// NOTE: branch/products/categories READS are PUBLIC (PR #24), so a backend built from current main
// serves REAL branch/product data to the guest (unauthenticated) SSR homepage. The api-client
// only falls back to MOCK fixtures if the backend is unreachable or running a STALE build that
// predates PR #24. The name assertions below assume a current backend; navigation, structure,
// and keyboard assertions remain valid regardless.

test.describe("Order — Customer Ordering App", () => {
  async function loginCustomer(page: import("@playwright/test").Page) {
    const res = await page.request.post("/api/auth", {
      data: {
        action: "login",
        email: process.env.E2E_CUSTOMER_EMAIL,
        password: process.env.E2E_CUSTOMER_PASSWORD,
      },
    });

    expect(
      res.ok(),
      `customer auth failed: ${res.status()} ${await res.text()}`,
    ).toBe(true);
  }

  test("homepage shows branch selection", async ({ page, request }) => {
    await page.goto("/");
await expect(page.locator("h1")).first().toBeVisible();

    const branchButtons = page.locator("main button");
    const branchesData = await fetchAll('branch', request);
    await expect(branchButtons).toHaveCount(branchesData.length);
    // Verify first three branches if present
if (branchesData[0]) {
  await expect(page.getByRole("button", { name: branchesData[0].name })).toBeVisible();
}
if (branchesData[1]) {
  await expect(page.getByRole("button", { name: branchesData[1].name })).toBeVisible();
}
if (branchesData[2]) {
  await expect(page.getByRole("button", { name: branchesData[2].name })).toBeVisible();
}
  });

test("selecting a branch navigates to menu", async ({ page, request }) => {
  await page.goto("/");
  const branches = await fetchAll('branch', request);
  if (branches[0]) {
    await page.getByRole("button", { name: new RegExp(branches[0].name) }).click();
  }
  await expect(page).toHaveURL(/\/menu/);
});

  test("menu page shows products", async ({ page, request }) => {
  const branchesData = await fetchAll('branch', request);
  const firstBranchName = branchesData[0]?.name || '';

    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(firstBranchName) }).click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.locator("a[href*='/menu/'] h3").first()).toBeVisible();
  });

  test("cart requires auth -> redirects to login", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login/);
  });

  test("checkout requires auth -> redirects to login", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
  });

  test("full ordering flow: branch → menu → product detail", async ({
    page,
    request,
  }) => {
  const branchesData = await fetchAll('branch', request);
  const firstBranchName = branchesData[0]?.name || '';

    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(firstBranchName) }).click();
    await expect(page).toHaveURL(/\/menu/);

    const productLink = page.locator("a[href*='/menu/']").first();
    await productLink.click();
    await expect(page).toHaveURL(/\/menu\/.+/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("authenticated customer can add, review, and place an order", async ({
    page,
    request,
  }) => {
    await loginCustomer(page);

    await page.goto("/");
    const authBranches = await fetchAll('branch', request);
    const authFirstBranchName = authBranches[0]?.name || '';
    await page.getByRole("button", { name: authFirstBranchName }).click();
    await expect(page).toHaveURL(/\/menu/);

    const products = await fetchAll('products', request);
    const product = products[0];
    await page.goto(`/menu/${product.slug}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(product.name, 'i') }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added to cart!")).toBeVisible();

    await page.getByRole("button", { name: "View Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(
      page.getByRole("heading", { name: /2 items, baked fresh/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(
      page.getByRole("heading", { name: /3 items, baked fresh/i }),
    ).toBeVisible();

    await page.locator("a[href='/checkout']").click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(
      page.getByRole("button", { name: /Pay with Pay at counter/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delivery" }).click();
    await expect(page.getByText("Deliver to")).toBeVisible();

    await page
      .getByRole("button", { name: /Pay with Pay at counter/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /Order placed/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("link", { name: /Track my order/i }),
    ).toBeVisible();
  });
});
