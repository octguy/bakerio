import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

// Helper to override baseURL per project using DEMO env vars
function overrideBaseURL(project) {
  const envVar = `DEMO_${project.name.toUpperCase()}_URL`;
  const override = process.env[envVar];
  if (override) {
    return { ...project, use: { ...project.use, baseURL: override } };
  }
  return project;
}

export default defineConfig({
  ...baseConfig,
  // Use new globalSetup for deployed instances
  globalSetup: "./e2e/global-setup.deployed.ts",
  // Disable local web server start; rely on deployed URLs
  webServer: undefined,
  reporter: [["html", { outputFolder: "playwright-report-deployed" }]],
  // Default retries for network flakiness; can be overridden via env
  retries: process.env.PLAYWRIGHT_RETRIES ? parseInt(process.env.PLAYWRIGHT_RETRIES) : 1,
  // Override each project’s baseURL with DEMO env when provided
  projects: baseConfig.projects.map(overrideBaseURL),
});
