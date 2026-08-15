import { defineConfig } from "vitest/config";

// Mirrors dashboard/vitest.config.ts. The two entitlement resolvers are
// hand-vendored copies of each other (this repo forbids cross-sibling imports),
// so each sibling tests its own copy — that pairing is what keeps them honest.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist", ".trigger"],
    // resolve-subscription-entitlement.ts throws at import when these are
    // unset — deliberately, since unset product ids misclassify rather than
    // error. Placeholders; nothing here talks to Stripe.
    env: {
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_API_PRODUCT_ID: "prod_legacy_api",
      STRIPE_PRICING_TIER_1K_PRODUCT_ID: "prod_tier_1k",
      STRIPE_PRICING_TIER_2_5K_PRODUCT_ID: "prod_tier_2_5k",
    },
  },
});
