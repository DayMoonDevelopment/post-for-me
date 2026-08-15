// Must come first: everything below reads process.env at module scope.
import "./load-env";

/**
 * This suite drives the real thing — a real local Supabase, a real Unkey API,
 * and a real Stripe test-mode account. There is no mock layer, because the
 * behavior under test *is* the interaction between those three: the webhook
 * reads live Stripe state and toggles live Unkey keys.
 *
 * It is therefore local-only and not wired into CI. See e2e/README.md.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is required to run the e2e suite. Add it to dashboard/.env — see dashboard/e2e/README.md.`,
    );
  }

  return value;
}

export const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

export const SUPABASE_URL = required("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

export const STRIPE_SECRET_KEY = required("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = required("STRIPE_WEBHOOK_SECRET");

export const UNKEY_API_ID = required("UNKEY_API_ID");
export const UNKEY_ROOT_KEY = required("UNKEY_ROOT_KEY");

/**
 * Optional. When unset, the suite finds a recurring price on one of the
 * configured pricing-tier products (see resolveTestPriceId), so a normal
 * dashboard `.env` is enough to run this with no extra setup.
 */
export const E2E_STRIPE_PRICE_ID = process.env.E2E_STRIPE_PRICE_ID || null;

/**
 * The pricing-tier products the app itself recognizes. A subscription has to be
 * on one of these for the entitlement resolver to classify it as `new_pricing`,
 * which is what the system-credential assertions depend on.
 */
export const PRICING_TIER_PRODUCT_IDS = [
  process.env.STRIPE_PRICING_TIER_1K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_2_5K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_5K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_10K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_20K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_40K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_100K_PRODUCT_ID,
  process.env.STRIPE_PRICING_TIER_200K_PRODUCT_ID,
].filter((id): id is string => Boolean(id));

export const E2E_USER_EMAIL =
  process.env.E2E_USER_EMAIL || "e2e-churn@example.com";
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || "password";
