import { defineConfig, devices } from "@playwright/test";

const shouldStartDevServer = process.env.PW_START_SERVER === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: shouldStartDevServer
    ? {
        command: "npm run dev",
        url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
