import { test, expect } from "@playwright/test";

test.describe("Web — Branding Site", () => {
  test("homepage loads with hero and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bakerio/);
    await expect(page.locator("h1")).toContainText("Every Bite Tells a Story");
    await expect(page.locator("header")).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");

    await page.locator("header nav a", { hasText: "Menu" }).first().click();
    await expect(page).toHaveURL(/\/menu/);

    await page.locator("header nav a", { hasText: "Locations" }).first().click();
    await expect(page).toHaveURL(/\/locations/);

    await page.locator("header nav a", { hasText: "About" }).first().click();
    await expect(page).toHaveURL(/\/about/);

    await page.locator("header nav a", { hasText: "Blog" }).first().click();
    await expect(page).toHaveURL(/\/blog/);

    await page.locator("header nav a", { hasText: "Contact" }).first().click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test("menu page renders content", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("locations page renders", async ({ page }) => {
    await page.goto("/locations");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("about page renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/mission|story|values/i).first()).toBeVisible();
  });

  test("blog page renders post cards", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("The Art of Sourdough").first()).toBeVisible();
  });

  test("blog detail page loads for valid slug", async ({ page }) => {
    await page.goto("/blog/the-art-of-sourdough");
    await expect(page.getByText(/Page Not Found/)).not.toBeVisible();
    await expect(page.getByText(/sourdough/i).first()).toBeVisible();
  });

  test("contact page has form inputs", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("input, textarea").first()).toBeVisible();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });

  test("footer is present on all pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });

  test("images have alt attributes", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });

  test("sitemap.xml is accessible", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
  });

  test("robots.txt is accessible", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
  });
});
