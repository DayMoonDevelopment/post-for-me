import path from "node:path";
import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts: that config loads the React Router
// plugin, which expects to be building an app rather than running unit tests.
// The `~` alias is declared directly rather than via vite-tsconfig-paths —
// vitest bundles its own Vite, and mixing the two plugin types doesn't
// typecheck.
export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "app"),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    // stripe.constants.ts throws at import time when these are unset, so they
    // have to exist before any module under test is loaded. The values are
    // placeholders — nothing here talks to Stripe.
    env: {
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_API_PRODUCT_ID: "prod_legacy_api",
      STRIPE_PRICING_TIER_1K_PRODUCT_ID: "prod_tier_1k",
      STRIPE_PRICING_TIER_2_5K_PRODUCT_ID: "prod_tier_2_5k",
    },
  },
});
