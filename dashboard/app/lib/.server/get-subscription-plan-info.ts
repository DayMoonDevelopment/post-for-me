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
