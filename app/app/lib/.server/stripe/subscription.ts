import { loadProductCatalog } from "~/lib/.server/subscription-access/catalog";
import { factsForItem, planDefiningItem } from "~/lib/.server/subscription-access/product";

import { stripe } from "./client";

/**
 * Whether a team has an active subscription, plus the plan metadata the API's
 * auth layer reads off a key (`plan_type`, `plan_name`, `plan_post_limit`,
 * `plan_product_id`). Best-effort: the flag is authoritative (it gates minting a
 * temp key), the metadata is advisory (stamped into key meta for the API).
 *
 * Classification is DELEGATED to `subscription-access/product`, deliberately.
 * This used to classify on its own — `items.data[0]`, then `tier ? new_pricing
 * : legacy` — which meant a legacy subscription's plan identity depended on the
 * order Stripe happened to return line items, and could name the team's plan
 * after its add-on. Two implementations of one rule also drifted: this one
 * never emitted `unknown`, so an unrecognized product was reported as legacy.
 */
export interface ActiveSubscriptionInfo {
  active: boolean;
  planMeta: Record<string, string>;
}

export async function getActiveSubscriptionInfo(
  stripeCustomerId: null | string,
): Promise<ActiveSubscriptionInfo> {
  if (!stripeCustomerId) return { active: false, planMeta: {} };

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });
  const subscription = subscriptions.data[0];
  if (!subscription) return { active: false, planMeta: {} };

  try {
    const catalog = await loadProductCatalog();
    // By precedence across every line item — never `items[0]`.
    const planItem = planDefiningItem(subscription.items.data, catalog);
    const planMeta = planItem ? factsForItem(planItem, catalog).planMeta : {};
    return { active: true, planMeta };
  } catch {
    // Plan metadata is advisory — a catalog read failure shouldn't block
    // minting. The `active` flag is what actually gates the key.
    return { active: true, planMeta: {} };
  }
}
