import { test, expect } from "@playwright/test";

const RUN = Date.now();
const MARK = `E2E ${RUN}`;

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("superadmin@bakerio.com");
  await page.getByLabel("Password", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.beforeEach(async ({ page }) => {
  await adminLogin(page);
});

test.afterAll(async () => {
  const fs = require("fs");
  const path = require("path");
  const ts = require("typescript");
  const source = fs.readFileSync(path.join(__dirname, "_cleanup.ts"), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  const tmpFile = path.join(process.env.RUNNER_TEMP || "/tmp", `cleanup-categories-${Date.now()}.js`);
  fs.writeFileSync(tmpFile, js, "utf8");
  try {
    const { cleanupByPrefix } = require(tmpFile);
    await cleanupByPrefix("categories", "E2E ");
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) {}
  }
});

test.describe("Admin — Categories CRUD", () => {
  test("displays categories in the data table", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText("Cakes", { exact: true })).toBeVisible();
    await expect(page.locator("table").getByText("Pastries", { exact: true })).toBeVisible();
  });

  test("creates a new category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("button", { name: /add category/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add category/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("dialog").locator("input").first().fill(`${MARK} Create`);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Category created")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Create`).first()).toBeVisible({ timeout: 10000 });
  });

  test("edits an existing category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Create throwaway category
    await page.getByRole("button", { name: /add category/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").locator("input").first().fill(`${MARK} Edit`);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("Category created")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Edit`).first()).toBeVisible({ timeout: 10000 });

    // Click the edit (pencil) icon button in the table row actions for the created category
    const editRow = page.locator("tbody tr", { hasText: `${MARK} Edit` });
    await editRow.locator("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input").first();
    await nameInput.fill(`${MARK} Edited`);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Category updated")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Edited`).first()).toBeVisible({ timeout: 10000 });
  });

  test("deletes a category", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Create throwaway category
    await page.getByRole("button", { name: /add category/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").locator("input").first().fill(`${MARK} Del`);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("Category created")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Del`).first()).toBeVisible({ timeout: 10000 });

    // Click the delete (trash) icon button — second button in created row's actions
    const deleteRow = page.locator("tbody tr", { hasText: `${MARK} Del` });
    await deleteRow.locator("button").nth(1).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /delete/i }).last().click();

    await expect(page.getByText("Category deleted")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Del`, { exact: true })).not.toBeVisible({ timeout: 10000 });
  });
});
