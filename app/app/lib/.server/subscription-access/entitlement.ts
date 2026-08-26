import type Stripe from "stripe";

import { stripe } from "~/lib/.server/stripe/client";

import { loadProductCatalog } from "./catalog";
import { factsForItem, planDefiningItem } from "./product";

/**
 * What a team's live Stripe state entitles it to. Read from Stripe rather than
 * from a webhook event payload, so a replayed or out-of-order delivery still
 * converges on the truth.
 */
export interface SubscriptionEntitlement {
  /** A live subscription — the gate on API access. */
  active: boolean;
  /** `plan_*` metadata the API's auth layer reads off a key. Empty when we
   * can't classify the plan; callers MERGE it, so empty leaves meta untouched. */
  planMeta: Record<string, string>;
  /** Whether the plan includes managed ("system") credentials. `null` = the
   * product catalog couldn't be read, so we couldn't classify — callers must
   * leave system-project keys alone rather than guess. */
  systemCredentials: boolean | null;
}

/** Subscription statuses that keep API access on. `past_due` is deliberately
 * excluded: a failed payment revokes access (this mirrors v1). */
const ENTITLING_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
]);

const NO_ACCESS: SubscriptionEntitlement = {
  active: false,
  planMeta: {},
  systemCredentials: false,
};

/**
 * Resolve what a Stripe customer is entitled to right now.
 *
 * Two independent questions, deliberately kept apart:
 *
 * 1. **Access** — does any subscription have an entitling STATUS? That alone
 *    decides whether the team's keys work, so an unclassifiable product never
 *    costs a paying team its access.
 * 2. **Plan** — what do the line items say? Every item of every entitling
 *    subscription is classified (see `product.ts`); the plan comes from the
 *    highest-precedence item, and managed credentials from ANY item that grants
 *    them (the add-on is its own line item, not a flag on the plan).
 */
export async function resolveSubscriptionEntitlement(
  stripeCustomerId: null | string,
): Promise<SubscriptionEntitlement> {
  if (!stripeCustomerId) return NO_ACCESS;

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
  });
  const entitling = subscriptions.data.filter((subscription) =>
    ENTITLING_STATUSES.has(subscription.status),
  );
  if (entitling.length === 0) return NO_ACCESS;

  // The catalog is what makes classification possible. Without it we know the
  // team is paying but not what for — say so instead of downgrading everyone.
  let catalog;
  try {
    catalog = await loadProductCatalog();
  } catch {
    return { active: true, planMeta: {}, systemCredentials: null };
  }
  if (catalog.tiers.length === 0) {
    return { active: true, planMeta: {}, systemCredentials: null };
  }

  const items = entitling.flatMap((subscription) => subscription.items.data);
  const facts = items.map((item) => factsForItem(item, catalog));

  const planItem = planDefiningItem(items, catalog);
  const planMeta = planItem ? factsForItem(planItem, catalog).planMeta : {};

  return {
    active: true,
    planMeta,
    systemCredentials: facts.some((fact) => fact.systemCredentials),
  };
}
