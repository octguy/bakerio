import { test, expect } from "@playwright/test";

const mockAuthUser = {
  user: { id: "user-1", email: "admin@bakerio.vn", full_name: "Admin User", roles: ["admin"] },
};

const mockProfile = {
  data: { id: "prof-1", user_id: "user-1", avatar_url: null, full_name: "Admin User", bio: "Bakery manager" },
};

const mockUpdatedProfile = {
  data: { id: "prof-1", user_id: "user-1", avatar_url: null, full_name: "Updated Admin", bio: "Bakery manager" },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockAuthUser) })
  );
});

test.describe("Admin — Profile Management", () => {
  test("view own profile shows user name", async ({ page }) => {
    await page.route("**/api/v1/profile", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockProfile) });
      }
      return route.continue();
    });

    await page.goto("/profile");
    await expect(page.getByText("Admin User")).toBeVisible();
  });

  test("update own profile", async ({ page }) => {
    await page.route("**/api/v1/profile", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockProfile) });
      }
      if (route.request().method() === "PATCH") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUpdatedProfile) });
      }
      return route.continue();
    });

    await page.goto("/profile");
    const nameInput = page.getByLabel(/full name|name/i);
    await nameInput.clear();
    await nameInput.fill("Updated Admin");
    await page.getByRole("button", { name: /save|update/i }).click();
    await expect(page.getByText(/updated|saved|success/i)).toBeVisible();
  });

  test("profile shows current user info from auth context", async ({ page }) => {
    await page.route("**/api/v1/profile", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockProfile) })
    );

    await page.goto("/profile");
    await expect(page.getByText("admin@bakerio.vn")).toBeVisible();
    await expect(page.getByText("Admin User")).toBeVisible();
  });
});
