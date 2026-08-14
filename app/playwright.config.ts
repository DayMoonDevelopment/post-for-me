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
const isCI = !!process.env.CI;
// CI runs `bun run build` in an earlier workflow step so it overlaps the
// ~2min Supabase docker pull instead of queueing behind it, then sets this —
// leaving `webServer` with nothing to do but boot the built server. Anywhere
// else (a bare `CI=1 bun run test:e2e`, a fresh clone) the build still has to
// happen here, or `react-router-serve` would boot against a stale/absent
// ./build.
const isPrebuilt = !!process.env.E2E_PREBUILT;
// `--headed` on its own runs every action at full speed, which is unwatchable.
// `E2E_SLOWMO` inserts a delay (ms) before each Playwright action so you can
// see the clicks and typing happen; `bun run test:e2e:headed` sets it to 300.
const slowMo = Number(process.env.E2E_SLOWMO) || 0;

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
  //
  // Under `E2E_SLOWMO` every action pays that delay on top, so give watched
  // runs extra headroom rather than have them time out mid-demo.
  timeout: slowMo ? 180_000 : 90_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: { slowMo },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI serves a real production build; local runs keep the dev server (HMR,
    // instant restarts, a warm `node_modules/.vite` from previous sessions).
    //
    // The dev server is not viable on a cold CI checkout. Vite discovers deps
    // it hasn't pre-bundled lazily, and a discovery made *after* the tab is
    // open re-optimizes and strands that tab with a duplicate React copy —
    // the documented failure in vite.config.ts's `optimizeDeps` comment. On
    // /login that throws inside `TooltipProvider` (root.tsx), which sits above
    // every error boundary, so hydration never completes and the email step's
    // submit button stays permanently disabled (`disabled={pending ||
    // !hydrated}` in email-step.tsx) — the click below times out with no
    // visible error. Warming the server graph via the `url` probe doesn't
    // help: the CLIENT module graph is first requested by the test's own
    // navigation, so that cost (and that hazard) lands inside the per-test
    // timeout. A built bundle has no dep optimizer and no lazy transform.
    command: isCI
      ? isPrebuilt
        ? "bun run start"
        : "bun run build && bun run start"
      : "bun run dev",
    // `react-router-serve` reads PORT from the environment and defaults to
    // 3000 — which is the local NestJS API. Pin it either way.
    env: { PORT: String(PORT) },
    // Probe `/login` specifically, not just `baseURL` — it's the route every
    // spec starts on, and in dev Vite compiles a route's server module graph
    // lazily on its first hit.
    url: `${baseURL}/login`,
    reuseExistingServer: !isCI,
    // Generous: unless the build already happened in CI, this covers
    // `react-router build` as well as boot.
    timeout: isCI && !isPrebuilt ? 300_000 : 120_000,
  },
});
