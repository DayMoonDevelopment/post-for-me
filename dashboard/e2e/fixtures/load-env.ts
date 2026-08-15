import path from "node:path";
import { loadEnv } from "vite";

/**
 * Hydrates `process.env` from the dashboard's `.env*` files.
 *
 * Playwright runs under plain Node, which doesn't read `.env` — only the Vite
 * dev server does, so without this the suite saw none of the app's own
 * configuration. Uses Vite's own `loadEnv` (already a devDependency, and what
 * vite.config.ts uses) so the e2e suite resolves env exactly the way the app
 * does, including `.env.local` overrides.
 *
 * Imported for its side effect, and must be imported before anything that reads
 * `process.env` at module scope.
 */
const DASHBOARD_ROOT = path.resolve(import.meta.dirname, "..", "..");

const loaded = loadEnv(
  process.env.NODE_ENV || "development",
  DASHBOARD_ROOT,
  "", // no prefix filter — these are server-side vars, not VITE_*
);

for (const [key, value] of Object.entries(loaded)) {
  // A variable exported in the real shell wins, so a one-off override still
  // works: `E2E_BASE_URL=... bun run test:e2e`.
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
