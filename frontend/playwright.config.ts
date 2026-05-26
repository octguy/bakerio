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
      command: "npm run start -w order -- -p 3001",
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run start -w admin -- -p 3002",
      port: 3002,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
