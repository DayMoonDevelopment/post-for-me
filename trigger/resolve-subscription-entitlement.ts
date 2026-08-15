import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Same "which product IDs include system credentials access" list the dashboard
// keeps in stripe.constants.ts. Duplicated (not imported) per this repo's
// dumb-monorepo rule.
const NEW_PRICING_TIER_PRODUCT_IDS = [
  process.env?.STRIPE_PRICING_TIER_1K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_2_5K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_5K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_10K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_20K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_40K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_100K_PRODUCT_ID,
  process.env?.STRIPE_PRICING_TIER_200K_PRODUCT_ID,
].filter((id): id is string => Boolean(id));

const STRIPE_API_PRODUCT_ID = process.env?.STRIPE_API_PRODUCT_ID || "";

// Mirrors dashboard/app/lib/.server/stripe.constants.ts's PRICING_TIERS and
// trigger/process-usage-limits.ts's copy. Duplicated per the dumb-monorepo rule.
const PRICING_TIERS = [
  { env: "STRIPE_PRICING_TIER_1K_PRODUCT_ID", name: "Pro", posts: 1000 },
  { env: "STRIPE_PRICING_TIER_2_5K_PRODUCT_ID", name: "Pro", posts: 2500 },
  { env: "STRIPE_PRICING_TIER_5K_PRODUCT_ID", name: "Pro", posts: 5000 },
  { env: "STRIPE_PRICING_TIER_10K_PRODUCT_ID", name: "Pro", posts: 10000 },
  { env: "STRIPE_PRICING_TIER_20K_PRODUCT_ID", name: "Pro", posts: 20000 },
  { env: "STRIPE_PRICING_TIER_40K_PRODUCT_ID", name: "Pro", posts: 40000 },
  { env: "STRIPE_PRICING_TIER_100K_PRODUCT_ID", name: "Pro", posts: 100000 },
  { env: "STRIPE_PRICING_TIER_200K_PRODUCT_ID", name: "Pro", posts: 200000 },
]
  .map((tier) => ({ ...tier, productId: process.env?.[tier.env] || "" }))
  .filter((tier) => tier.productId);

const ENTITLING_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

const IMMEDIATE_REVOKE_STATUSES: Stripe.Subscription.Status[] = [
  "canceled",
  "incomplete_expired",
];

export type EntitlementVerdict =
  | "entitled"
  | "immediate_revoke"
  | "payment_failure";

export type SubscriptionEntitlement = {
  verdict: EntitlementVerdict;
  latestStatus: Stripe.Subscription.Status | null;
  grantsSystemCredentials: boolean;
  /**
   * Unkey key metadata for the entitling plan, or `null` when not entitled.
   *
   * The sweep has to restamp this, not just the `enabled` bit:
   * `api/src/auth/auth.guard.ts` gates /social-account-feeds on
   * `meta.plan_type === "new_pricing"`, so a dropped upgrade webhook would
   * otherwise leave a paying team enabled but permanently 401'd on feeds, with
   * nothing to correct it.
   */
  planMetadata: Record<string, string> | null;
};

function planMetadataFor(
  subscription: Stripe.Subscription,
): Record<string, string> {
  const productIds = (subscription.items?.data ?? []).map(
    (item) => item.price.product as string,
  );

  const tier = PRICING_TIERS.find((t) => productIds.includes(t.productId));

  if (tier) {
    return {
      plan_product_id: tier.productId,
      plan_name: tier.name,
      plan_post_limit: tier.posts.toString(),
      plan_type: "new_pricing",
    };
  }

  if (STRIPE_API_PRODUCT_ID && productIds.includes(STRIPE_API_PRODUCT_ID)) {
    return {
      plan_product_id: STRIPE_API_PRODUCT_ID,
      plan_name: "Legacy Plan",
      plan_type: "legacy",
    };
  }

  return { plan_type: "unknown" };
}

function subscriptionGrantsSystemCredentials(
  subscription: Stripe.Subscription,
): boolean {
  return Boolean(
    subscription.items?.data?.some((item) => {
      const productId = item.price.product as string;

      if (NEW_PRICING_TIER_PRODUCT_IDS.includes(productId)) return true;

      return item.price?.metadata?.allows_system_credentials_access === "true";
    }),
  );
}

/**
 * Trigger-local copy of the reduction in
 * dashboard/app/lib/.server/resolve-subscription-entitlement.request.ts.
 * Vendored rather than imported per this repo's dumb-monorepo rule — keep both
 * in sync if the entitlement rules change.
 *
 * A customer can hold more than one subscription, so entitlement is decided
 * across all of them rather than from whichever one Stripe returns first.
 */
export function reduceSubscriptionsToEntitlement(
  subscriptions: Stripe.Subscription[],
): SubscriptionEntitlement {
  const entitling = subscriptions.filter((sub) =>
    ENTITLING_STATUSES.includes(sub.status),
  );

  if (entitling.length > 0) {
    // Prefer a new-pricing tier for plan metadata, so a tier subscription
    // sitting alongside an add-on is the one that names the plan.
    const planSubscription =
      entitling.find(
        (sub) => planMetadataFor(sub).plan_type === "new_pricing",
      ) ??
      entitling.find((sub) => planMetadataFor(sub).plan_type === "legacy") ??
      entitling[0];

    return {
      verdict: "entitled",
      latestStatus: planSubscription.status,
      grantsSystemCredentials: entitling.some(
        subscriptionGrantsSystemCredentials,
      ),
      planMetadata: planMetadataFor(planSubscription),
    };
  }

  if (subscriptions.length === 0) {
    return {
      verdict: "immediate_revoke",
      latestStatus: null,
      grantsSystemCredentials: false,
      planMetadata: null,
    };
  }

  const paymentFailure = subscriptions.find(
    (sub) => !IMMEDIATE_REVOKE_STATUSES.includes(sub.status),
  );

  return {
    verdict: paymentFailure ? "payment_failure" : "immediate_revoke",
    latestStatus: (paymentFailure ?? subscriptions[0]).status,
    grantsSystemCredentials: false,
    planMetadata: null,
  };
}

export async function resolveSubscriptionEntitlement(
  stripeCustomerId: string | null | undefined,
): Promise<SubscriptionEntitlement> {
  if (!stripeCustomerId) {
    return reduceSubscriptionsToEntitlement([]);
  }

  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined = undefined;

  for (;;) {
    const page: Stripe.ApiList<Stripe.Subscription> =
      await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

    subscriptions.push(...page.data);

    if (!page.has_more || page.data.length === 0) break;

    startingAfter = page.data[page.data.length - 1].id;
  }

  return reduceSubscriptionsToEntitlement(subscriptions);
}
