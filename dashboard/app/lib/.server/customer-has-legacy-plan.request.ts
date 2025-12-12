import { stripe } from "./stripe";
import { getSubscriptionPlanInfo } from "./get-subscription-plan-info";

export async function customerHasLegacyPlan(
  stripeCustomerId: string | null | undefined
) {
  if (!stripeCustomerId) {
    return false;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
  });

  // Check if any active subscription is a legacy plan
  for (const subscription of subscriptions.data) {
    const planInfo = getSubscriptionPlanInfo(subscription);
    if (planInfo.isLegacy) {
      return true;
    }
  }

  return false;
}
