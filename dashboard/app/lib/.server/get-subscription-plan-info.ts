import type Stripe from "stripe";
import {
  STRIPE_API_PRODUCT_ID,
  PRICING_TIERS,
  NEW_PRICING_TIER_PRODUCT_IDS,
} from "./stripe.constants";

export type PlanInfo = {
  isLegacy: boolean;
  isNewPricing: boolean;
  productId: string | null;
  planName: string | null;
  postLimit: number | null;
  price: number | null;
  includesSystemCredentials: boolean;
};

/**
 * Extract plan information from a Stripe subscription
 */
export function getSubscriptionPlanInfo(
  subscription: Stripe.Subscription | null,
): PlanInfo {
  if (!subscription) {
    return {
      isLegacy: false,
      isNewPricing: false,
      productId: null,
      planName: null,
      postLimit: null,
      price: null,
      includesSystemCredentials: false,
    };
  }

  // Check if subscription has any new pricing tier products
  for (const item of subscription.items.data) {
    const productId = item.price.product as string;
    if (NEW_PRICING_TIER_PRODUCT_IDS.includes(productId)) {
      const tier = PRICING_TIERS.find((t) => t.productId === productId);
      if (tier) {
        return {
          isLegacy: false,
          isNewPricing: true,
          productId: tier.productId,
          planName: tier.name,
          postLimit: tier.posts,
          price: tier.price,
          includesSystemCredentials: true,
        };
      }
    }
  }

  // Check if subscription has legacy product
  const hasLegacyProduct = subscription.items.data.some(
    (item) => item.price.product === STRIPE_API_PRODUCT_ID,
  );

  if (hasLegacyProduct) {
    return {
      isLegacy: true,
      isNewPricing: false,
      productId: STRIPE_API_PRODUCT_ID,
      planName: "Legacy Plan",
      postLimit: null,
      price: null,
      includesSystemCredentials: false,
    };
  }

  // Unknown subscription type
  return {
    isLegacy: false,
    isNewPricing: false,
    productId: null,
    planName: null,
    postLimit: null,
    price: null,
    includesSystemCredentials: false,
  };
}

/**
 * The plan fields we stamp onto an Unkey key's metadata.
 *
 * `plan_type` is a cross-service contract: `api/src/auth/auth.guard.ts` reads it
 * off the verified key and gates /social-account-feeds on `"new_pricing"`. It
 * was previously rebuilt inline at every mint/sync site, which is how those
 * sites drifted apart — one source now, so a key minted in the dashboard and a
 * key restamped by the reconcile sweep describe the plan the same way.
 */
export function planMetadataFromPlanInfo(
  planInfo: PlanInfo,
): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (planInfo.productId) {
    metadata.plan_product_id = planInfo.productId;
  }
  if (planInfo.planName) {
    metadata.plan_name = planInfo.planName;
  }
  if (planInfo.postLimit) {
    metadata.plan_post_limit = planInfo.postLimit.toString();
  }

  metadata.plan_type = planInfo.isNewPricing
    ? "new_pricing"
    : planInfo.isLegacy
      ? "legacy"
      : "unknown";

  return metadata;
}
