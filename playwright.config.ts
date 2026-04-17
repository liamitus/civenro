import { defineConfig, devices } from "@playwright/test";

// Run against a remote URL when provided (e.g. a Vercel preview), otherwise
// boot the local dev server on port 1776. CI sets PLAYWRIGHT_BASE_URL to the
// preview URL once the Vercel deployment succeeds.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:1776";
const reuseLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: reuseLocalServer
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
