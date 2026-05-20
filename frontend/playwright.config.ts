import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
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
      command: "npm run dev -w web -- -p 3000",
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev -w order -- -p 3001",
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev -w admin -- -p 3002",
      port: 3002,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
