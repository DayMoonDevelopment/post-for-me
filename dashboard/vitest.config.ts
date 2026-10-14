import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Server-side `.server` modules read Stripe/Supabase config straight off
  // `process.env` (not `import.meta.env`), and some throw at import time if
  // it's missing — so mirror .env into process.env for the test run too.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: "node",
    },
  };
});
