process.env.E2E_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || "customer1@bakerio.com";
process.env.E2E_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || "123456";
process.env.E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "superadmin@bakerio.com";
process.env.E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "123456";
process.env.NEXT_PUBLIC_CONTACT_ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || "http://localhost:3000/api/contact-mock";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "web",
      use: { baseURL: "http://localhost:3000" },
      testMatch: /web\/.*/,
    },
    {
      name: "order",
      use: { baseURL: "http://localhost:3001" },
      testMatch: /order\/.*/,
    },
    {
      name: "admin",
      use: { baseURL: "http://localhost:3002" },
      testMatch: /admin\/.*/,
    },
    {
      name: "a11y",
      testMatch: /a11y\/.*/,
    },
  ],
  webServer: [
    {
      command: "npm run build -w web && npx -y serve -l 3000 apps/web/out",
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "NEXT_PUBLIC_DISABLE_MOCK_FALLBACK=true npm run build -w order && NEXT_PUBLIC_DISABLE_MOCK_FALLBACK=true npm run start -w order -- -p 3001",
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "NEXT_PUBLIC_DISABLE_MOCK_FALLBACK=true npm run build -w admin && NEXT_PUBLIC_DISABLE_MOCK_FALLBACK=true npm run start -w admin -- -p 3002",
      port: 3002,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
