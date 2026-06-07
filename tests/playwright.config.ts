import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:   "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries:   process.env.CI ? 2 : 0,
  workers:   process.env.CI ? 1 : undefined,
  reporter:  [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL:         process.env.BASE_URL ?? "http://localhost:3000",
    trace:           "on-first-retry",
    screenshot:      "only-on-failure",
    video:           "retain-on-failure",
    actionTimeout:   10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Setup: create a shared auth state once
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Desktop Chrome — runs all tests, depends on setup
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // Firefox smoke test on CI
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: /.*smoke.*/,
    },
    // Mobile Chrome
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: /.*smoke.*/,
    },
  ],

  // Start Next.js dev server automatically during tests
  webServer: {
    command:     "npm run dev",
    cwd:         "../frontend",
    url:         "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout:     120_000,
  },
});
