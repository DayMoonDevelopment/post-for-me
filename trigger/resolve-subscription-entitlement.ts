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

// Fail at import rather than misclassify at runtime. With the tier ids unset,
// every check below silently degrades instead of erroring: no product matches
// NEW_PRICING_TIER_PRODUCT_IDS, so `allows_system_credentials_access` — which
// lives only on the add-on prices, never on the tier products — becomes the
// only path to a grant, and every Pro team resolves `grantsSystemCredentials:
// false`. The hourly sweep would then disable the managed-credential keys of
// the entire fleet, and stamp `plan_type: "unknown"`, 401ing everyone on
// /social-account-feeds. Mirrors the same guard in
// dashboard/app/lib/.server/stripe.constants.ts.
if (PRICING_TIERS.length === 0) {
  throw new Error(
    "No STRIPE_PRICING_TIER_*_PRODUCT_ID env vars are set; refusing to resolve entitlement, as every subscription would misclassify as unknown",
  );
}

if (!STRIPE_API_PRODUCT_ID) {
  throw new Error("STRIPE_API_PRODUCT_ID is not defined");
}

const ENTITLING_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

/**
 * Statuses with no claim to a grace period: given up by choice (`canceled`) or
 * never completed (`incomplete`, `incomplete_expired`). `incomplete` is here
 * because Stripe leaves an abandoned checkout's subscription in that status for
 * ~23 hours, and counting it as a payment failure would convert an explicit
 * cancellation into a full grace period.
 */
const IMMEDIATE_REVOKE_STATUSES: Stripe.Subscription.Status[] = [
  "canceled",
  "incomplete",
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
   * Unkey key metadata for the plan that currently backs access, or `null` on
   * `immediate_revoke`, where no access is being granted and stamping metadata
   * would only write to keys on their way down.
   *
   * The sweep has to restamp this, not just the `enabled` bit:
   * `api/src/auth/auth.guard.ts` gates /social-account-feeds on
   * `meta.plan_type === "new_pricing"`, so a dropped upgrade webhook would
   * otherwise leave a paying team enabled but permanently 401'd on feeds, with
   * nothing to correct it.
   *
   * Populated on `payment_failure` too: reconcile-subscription-access.ts
   * re-enables teams inside their grace window, so they need the same drift
   * repair an entitled team gets.
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
 * The one subscription that currently backs a customer's access, or `null` when
 * nothing does.
 *
 * Entitled customers get the subscription that names the plan — a new-pricing
 * tier first, then a legacy plan — so a tier sitting alongside an add-on is the
 * one that answers. Customers with no entitling subscription get the
 * payment-failing one, because a team inside its grace window is still running
 * on that subscription's plan and metering against it.
 *
 * Exported so metering agrees with enforcement about which subscription a post
 * belongs to. `increment-team-usage.ts` previously asked Stripe for
 * `status: "active"` directly, which excluded both trialing teams and teams
 * inside their grace window — exactly the teams enforcement keeps enabled — so
 * their posts published and then failed to meter.
 */
export function selectBillableSubscription(
  subscriptions: Stripe.Subscription[],
): Stripe.Subscription | null {
  const entitling = subscriptions.filter((sub) =>
    ENTITLING_STATUSES.includes(sub.status),
  );

  if (entitling.length > 0) {
    return (
      entitling.find(
        (sub) => planMetadataFor(sub).plan_type === "new_pricing",
      ) ??
      entitling.find((sub) => planMetadataFor(sub).plan_type === "legacy") ??
      entitling[0]
    );
  }

  return (
    subscriptions.find(
      (sub) => !IMMEDIATE_REVOKE_STATUSES.includes(sub.status),
    ) ?? null
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
  const billable = selectBillableSubscription(subscriptions);

  // `billable` is non-null whenever anything is entitling; the check is here to
  // narrow the type, not because the case is reachable.
  if (entitling.length > 0 && billable) {
    return {
      verdict: "entitled",
      latestStatus: billable.status,
      grantsSystemCredentials: entitling.some(
        subscriptionGrantsSystemCredentials,
      ),
      planMetadata: planMetadataFor(billable),
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

  return {
    verdict: billable ? "payment_failure" : "immediate_revoke",
    latestStatus: (billable ?? subscriptions[0]).status,
    // Load-bearing for the grace period: reconcile-subscription-access.ts
    // re-enables teams inside their window, and reporting `false` here would
    // make that sync quietly disable their managed-credential projects — a
    // downgrade in the middle of the grace period they were promised. Reports
    // what the failing subscription would grant; still false on the revoke
    // path, where nothing is being enabled.
    grantsSystemCredentials: billable
      ? subscriptionGrantsSystemCredentials(billable)
      : false,
    // Same reasoning as grantsSystemCredentials above. A team re-enabled inside
    // its grace window still needs its plan metadata reconciled — reporting
    // `null` here meant the sweep repaired the `enabled` bit but never the
    // stale `plan_type` beside it, leaving an in-grace team enabled and
    // permanently 401'd on /social-account-feeds until it recovered.
    planMetadata: billable ? planMetadataFor(billable) : null,
  };
}

/**
 * Every subscription the customer holds. Paginated rather than `limit: 1` — the
 * whole point is to see all of them, not the newest one.
 */
async function listAllSubscriptions(
  stripeCustomerId: string,
): Promise<Stripe.Subscription[]> {
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

  return subscriptions;
}

export async function resolveSubscriptionEntitlement(
  stripeCustomerId: string | null | undefined,
): Promise<SubscriptionEntitlement> {
  if (!stripeCustomerId) {
    return reduceSubscriptionsToEntitlement([]);
  }

  return reduceSubscriptionsToEntitlement(
    await listAllSubscriptions(stripeCustomerId),
  );
}

/**
 * The subscription a post should be metered against, read from live Stripe.
 * `null` when the customer has nothing backing access at all — callers should
 * treat that as an error, since a post published by a customer in that state
 * means enforcement let something through.
 */
export async function resolveBillableSubscription(
  stripeCustomerId: string | null | undefined,
): Promise<Stripe.Subscription | null> {
  if (!stripeCustomerId) return null;

  return selectBillableSubscription(await listAllSubscriptions(stripeCustomerId));
}
