import { test, expect } from "@playwright/test";

test.describe("Web — Branding Site", () => {
  test("homepage loads with hero and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bakerio/);
    await expect(page.locator("h1")).toContainText(/Every\s+bite tells\s+a story\./);
    await expect(page.locator("header")).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");

    await page.locator("header nav a", { hasText: "Bánh" }).first().click();
    await expect(page).toHaveURL(/\/menu/);

    await page.locator("header nav a", { hasText: "Locations" }).first().click();
    await expect(page).toHaveURL(/\/locations/);

    await page.locator("header nav a", { hasText: "Journal" }).first().click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test("menu page renders content", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.locator("h1")).toContainText(/Menu\s+du jour\./i);
    await expect(page.getByText("Category")).toBeVisible();
    await expect(page.getByText("Allergens")).toBeVisible();
  });

  test("locations page renders", async ({ page }) => {
    await page.goto("/locations");
    await expect(page.locator("h1")).toContainText(/Eleven shops,\s*one city\./i);
    await expect(page.getByText("Hồ Chí Minh City")).toBeVisible();
  });

  test("about page renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toContainText(/We started\s+with one\s+oven\./i);
    await expect(page.getByText(/Linh and Khoa/i)).toBeVisible();
    await expect(page.getByText(/established|shops|bakers/i).first()).toBeVisible();
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

  test("contact page form validation and submission", async ({ page }) => {
    await page.goto("/contact");

    // Try submitting empty fields to check validation errors
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
    await expect(page.getByText(/subject is required/i)).toBeVisible();
    await expect(page.getByText(/message is required/i)).toBeVisible();

    // Fill valid data and submit
    await page.locator("#contact-name").fill("John Doe");
    await page.locator("#contact-email").fill("john@example.com");
    await page.locator("#contact-subject").fill("Feedback");
    await page.locator("#contact-message").fill("Excellent service!");
    await page.getByRole("button", { name: /send message/i }).click();

    // Verify submission confirmation
    await expect(page.getByText("Thank you.")).toBeVisible();
    await expect(page.getByText(/We'll write back/i)).toBeVisible();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByText(/loaf not found/i)).toBeVisible();
  });

  test("footer is present on all pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });

  test("images have alt attributes and are loaded successfully", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();

      const isLoaded = await img.evaluate((element: HTMLImageElement) => {
        return element.complete && typeof element.naturalWidth !== 'undefined' && element.naturalWidth > 0;
      });
      expect(isLoaded).toBe(true);
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
