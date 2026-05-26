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
  const tmpFile = path.join(process.env.RUNNER_TEMP || "/tmp", `cleanup-branches-${Date.now()}.js`);
  fs.writeFileSync(tmpFile, js, "utf8");
  try {
    const { cleanupByPrefix } = require(tmpFile);
    await cleanupByPrefix("branch", "E2E ");
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) {}
  }
});

test.describe("Admin — Branches Management", () => {
  test("branches page loads and shows data", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByText("Bakerio Quận 1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bakerio Hoàn Kiếm")).toBeVisible();
  });

  test("create new branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByRole("button", { name: /add branch/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add branch/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("dialog").locator("input").first().fill(`${MARK} Create`);
    await page.getByRole("dialog").locator("input").nth(1).fill("100 Phan Xích Long");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created|success/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Create`).first()).toBeVisible({ timeout: 10000 });
  });

  test("edit branch", async ({ page }) => {
    await page.goto("/branches");
    await expect(page.getByRole("button", { name: /add branch/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add branch/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("dialog").locator("input").first().fill(`${MARK} Edit`);
    await page.getByRole("dialog").locator("input").nth(1).fill("100 Phan Xích Long");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/branch created|success/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(`${MARK} Edit`).first()).toBeVisible({ timeout: 10000 });

    // Locate that row by name (`page.locator("tbody tr", { hasText: `${MARK} Edit` })`),
    // click its edit (first) button, change the name to `${MARK} Edited`, save, and assert `${MARK} Edited` is visible.
    const editRow = page.locator("tbody tr", { hasText: `${MARK} Edit` });
    await editRow.locator("button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Branch" })).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input").first();
    await nameInput.clear();
    await nameInput.fill(`${MARK} Edited`);
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Branch updated")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`${MARK} Edited`).first()).toBeVisible();
  });
});
