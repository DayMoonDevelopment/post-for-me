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
  // delivery can take up to 45s on a cold container — see
  // e2e/fixtures/mailpit.ts). 60s was already tight on top of that once you
  // add page load/hydration + typing + the post-verify navigation — bumped
  // for margin after seeing it flake in CI on hydration alone, before the
  // OTP wait even starts.
  timeout: 90_000,
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
    // Probe `/login` specifically, not just `baseURL` — it's the route every
    // spec starts on, and Vite's dev server compiles a route's module graph
    // lazily on its first hit. Probing `/` doesn't pay that cost for
    // `/login`, so the first real test navigation could stall past the
    // login form's hydration wait (see email-step.tsx's `disabled={!hydrated}`)
    // and get flagged flaky by the per-test timeout instead. Probing the
    // actual route here means that cost lands in this step's own generous
    // timeout instead.
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    // SSR plus Vite's cold dependency pre-bundling (see vite.config.ts) can
    // make a first boot slow.
    timeout: 120_000,
  },
});
