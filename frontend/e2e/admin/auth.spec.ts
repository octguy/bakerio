import { test, expect } from "@playwright/test";

const mockUser = {
  id: "user-1",
  email: "admin@bakerio.vn",
  full_name: "Admin User",
  roles: ["admin"],
};

test.describe("Admin — Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.route("**/api/auth", (route, request) => {
      const body = JSON.parse(request.postData() || "{}");
      if (body.action === "me") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null }) });
      }
      if (body.action === "login") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, user: mockUser }) });
      }
      return route.continue();
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@bakerio.vn");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).not.toHaveURL(/\/login/);
  });

  test("login with invalid credentials shows error message", async ({ page }) => {
    await page.route("**/api/auth", (route, request) => {
      const body = JSON.parse(request.postData() || "{}");
      if (body.action === "me") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null }) });
      }
      if (body.action === "login") {
        return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "invalid credentials" }) });
      }
      return route.continue();
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("invalid credentials")).toBeVisible();
  });

  test("login form shows validation errors when fields are empty", async ({ page }) => {
    await page.route("**/api/auth", (route, request) => {
      const body = JSON.parse(request.postData() || "{}");
      if (body.action === "me") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null }) });
      }
      return route.continue();
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Sign In" }).click();

    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveJSProperty("validity.valueMissing", true);
  });

  test("logout redirects to login page", async ({ page }) => {
    // Start authenticated
    await page.route("**/api/auth", (route, request) => {
      const body = JSON.parse(request.postData() || "{}");
      if (body.action === "me") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: mockUser }) });
      }
      if (body.action === "logout") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      }
      return route.continue();
    });

    await page.goto("/");
    await expect(page.getByText("Dashboard")).toBeVisible();

    await page.getByRole("button", { name: "Sign Out" }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
