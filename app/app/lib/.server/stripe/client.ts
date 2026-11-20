import Stripe from "stripe";

/**
 * The server-side Stripe client. The dashboard uses it to create Checkout /
 * billing-portal sessions, to read product/subscription state for the billing
 * step, and to verify its own narrow webhooks (`webhook/stripe/*` — see
 * `./webhook.ts`). Every other Stripe event is the API's, and the API remains
 * the intended source of paid-lifecycle/conversion events. Each webhook reads
 * its OWN signing secret, so none lives here.
 *
 * No `apiVersion` is pinned: the dashboard only touches stable surfaces
 * (Checkout, portal, subscription/product reads), so it follows the account's
 * default API version rather than fighting the SDK's latest-version typings.
 */
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY must be set for billing. Add it to your .env.",
  );
}

export const stripe = new Stripe(secretKey, { typescript: true });
