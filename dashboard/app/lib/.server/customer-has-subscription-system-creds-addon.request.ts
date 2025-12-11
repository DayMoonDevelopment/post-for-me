import { stripe } from "./stripe";
import { NEW_PRICING_TIER_PRODUCT_IDS } from "./stripe.constants";

export async function customerHasSubscriptionSystemCredsAddon(
  stripeCustomerId: string | null | undefined
) {
  let hasActiveSubscription = false;

  if (stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
    });
    hasActiveSubscription = subscriptions.data.some((sub) => {
      if (sub.status !== "active") return false;

      return sub.items?.data?.some((item) => {
        const productId = item.price.product as string;
        
        // Check if on new pricing model (all new pricing tiers include system creds)
        if (NEW_PRICING_TIER_PRODUCT_IDS.includes(productId)) {
          return true;
        }
        
        // Check legacy addon metadata
        return item.price?.metadata?.allows_system_credentials_access === "true";
      });
    });
  }

  return hasActiveSubscription;
}
