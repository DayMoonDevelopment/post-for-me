// Must come first: Playwright runs under Node, which doesn't read .env on its own.
import "./e2e/fixtures/load-env";

import { defineConfig, devices } from "@playwright/test";

import { STORAGE_STATE } from "./e2e/fixtures/paths";

// Not imported from e2e/fixtures/env.ts: that module fails fast on missing
// credentials, which is right for a run but wrong for merely loading the config
// (`--list`, editor integrations).
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

const SLOWMO = Number(process.env.E2E_SLOWMO || 0);

/**
 * Local-only suite — deliberately not wired into CI. It drives a real Stripe
 * test account and a real Unkey API, so it needs credentials CI doesn't carry
 * and it mutates shared external state. See e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  // Scenarios share one Stripe account and one Unkey API; running them in
  // parallel makes rate limits, not the code, decide whether the suite passes.
  workers: 1,
  fullyParallel: false,
  timeout: SLOWMO ? 180_000 : 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    ...(SLOWMO ? { launchOptions: { slowMo: SLOWMO } } : {}),
  },
  projects: [
    {
      // Mints the authenticated storageState. A project rather than
      // `globalSetup`, which Playwright runs *before* webServer is up.
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testMatch: /tests\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
