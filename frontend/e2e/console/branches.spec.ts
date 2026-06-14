import { test, expect } from "@playwright/test";
import { cleanupByPrefix } from "../helpers/cleanup";
import { fetchAll } from "../helpers/fetchAll";

const RUN = Date.now();
const MARK = `E2E ${RUN}`;

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.beforeEach(async ({ page }) => {
  await adminLogin(page);
});

test.afterAll(async () => {
  await cleanupByPrefix("branch", "E2E ");
});

test.describe("Admin — Branches Management", () => {
  test("branches page loads and shows data", async ({ page, request }) => {
    await page.goto("/branches");
    const branchesData = await fetchAll('branch', request);
    const firstBranch = branchesData[0];
    await expect(page.getByText(firstBranch.name)).toBeVisible({ timeout: 10000 });
    if (branchesData.length > 1) {
      await expect(page.getByText(branchesData[1].name)).toBeVisible();
    }
  });

  test("create new branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByRole("button", { name: /add branch/i })).toBeVisible(
      { timeout: 10000 },
    );
    await page.getByRole("button", { name: /add branch/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page
      .getByRole("dialog")
      .locator("input")
      .first()
      .fill(`${MARK} Create`);
    await page
      .getByRole("dialog")
      .locator("input")
      .nth(1)
      .fill(`${MARK} Address`);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created|success/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("table").getByText(`${MARK} Create`).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("edit branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByRole("button", { name: /add branch/i })).toBeVisible(
      { timeout: 10000 },
    );
    await page.getByRole("button", { name: /add branch/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page
      .getByRole("dialog")
      .locator("input")
      .first()
      .fill(`${MARK} Edit`);
    await page
      .getByRole("dialog")
      .locator("input")
      .nth(1)
      .fill(`${MARK} Address`);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created|success/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("table").getByText(`${MARK} Edit`).first(),
    ).toBeVisible({ timeout: 10000 });

    // Locate that row by name (`page.locator("tbody tr", { hasText: `${MARK} Edit` })`),
    // click its edit (first) button, change the name to `${MARK} Edited`, save, and assert `${MARK} Edited` is visible.
    const editRow = page.locator("tbody tr", { hasText: `${MARK} Edit` });
    await editRow.locator("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Edit Branch" }),
    ).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input").first();
    await nameInput.clear();
    await nameInput.fill(`${MARK} Edited`);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Branch updated")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(`${MARK} Edited`).first()).toBeVisible();
  });
});
