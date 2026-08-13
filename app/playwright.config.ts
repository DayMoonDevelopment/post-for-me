import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Bun auto-loads `.env` for `bun run ...`, but IDE test runners and `npx
// playwright test` invoke this config under plain Node, which doesn't — so
// load it explicitly, resolved against this file's own directory (not
// `process.cwd()`, which varies by launcher).
loadEnv({ path: path.resolve(import.meta.dirname, ".env") });

const PORT = Number(process.env.PORT) || 7361;
const baseURL = `http://localhost:${PORT}`;

/**
 * This suite talks to a real Supabase instance and a real NestJS API — there
 * is no MSW layer to fall back to — so a local Supabase (`cd api && bun run
 * supabase:start`) and the local API (`cd api && bun run start:dev`) must
 * already be running before `bun run test:e2e`. See the "E2E tests" section
 * in README.md.
 */
export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/fixtures/global-setup.ts",
  // Playwright's 30s default is tight against the OTP wait alone (local mail
  // delivery can take up to 45s on a cold container — see e2e/fixtures/mailpit.ts).
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // SSR plus Vite's cold dependency pre-bundling (see vite.config.ts) can
    // make a first boot slow.
    timeout: 120_000,
  },
});
