import { stripe } from "./stripe";
import { NEW_PRICING_TIER_PRODUCT_IDS } from "./stripe.constants";
import { getSubscriptionPlanInfo, type PlanInfo } from "./get-subscription-plan-info";

import type Stripe from "stripe";

/**
 * Statuses that entitle a team to API access.
 */
const ENTITLING_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing"];

/**
 * Statuses with no claim to a grace period: the team either gave the
 * subscription up by choice (`canceled`) or never completed one in the first
 * place (`incomplete`, `incomplete_expired`). Access is revoked immediately.
 * Every other non-entitling status (past_due, unpaid, paused, ...) describes a
 * subscription that *was* paying and stopped, which is what the grace period
 * exists for.
 *
 * `incomplete` sits here rather than with the payment failures because Stripe
 * leaves an abandoned checkout's subscription `incomplete` for ~23 hours
 * before expiring it. Counted as a payment failure, that leftover would
 * silently convert an explicit cancellation into a full grace period and keep
 * a churned team's API keys working for days.
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
  /**
   * Representative status: the entitling subscription's when there is one,
   * otherwise the first subscription's. `null` when the customer has no
   * subscriptions at all.
   */
  latestStatus: Stripe.Subscription.Status | null;
  /** Plan info for the entitling subscription, or the empty plan when none. */
  planInfo: PlanInfo;
  /** Whether an entitling subscription grants managed/system credentials. */
  grantsSystemCredentials: boolean;
};

function subscriptionGrantsSystemCredentials(
  subscription: Stripe.Subscription,
): boolean {
  return Boolean(
    subscription.items?.data?.some((item) => {
      const productId = item.price.product as string;

      // Every new-pricing tier includes system credentials.
      if (NEW_PRICING_TIER_PRODUCT_IDS.includes(productId)) {
        return true;
      }

      // Legacy plans grant it only via an explicit add-on price.
      return item.price?.metadata?.allows_system_credentials_access === "true";
    }),
  );
}

/**
 * Reduces every subscription a customer has to a single access verdict.
 *
 * Pure — no network — so the decision itself is unit-testable. Callers that
 * need to hit Stripe should use `resolveSubscriptionEntitlement`.
 *
 * A customer can hold more than one subscription (a tier plus an add-on, or a
 * canceled one alongside its replacement). Answering from any single
 * subscription — including "the most recently created" — revokes access for
 * customers who are still paying, so entitlement is decided across all of them.
 */
export function reduceSubscriptionsToEntitlement(
  subscriptions: Stripe.Subscription[],
): SubscriptionEntitlement {
  const entitling = subscriptions.filter((sub) =>
    ENTITLING_STATUSES.includes(sub.status),
  );

  if (entitling.length > 0) {
    // Prefer a new-pricing tier for plan metadata, then a legacy plan, so a
    // tier subscription sitting alongside an add-on is the one that names the
    // plan. Falls back to the first entitling subscription.
    const planSubscription =
      entitling.find((sub) => getSubscriptionPlanInfo(sub).isNewPricing) ??
      entitling.find((sub) => getSubscriptionPlanInfo(sub).isLegacy) ??
      entitling[0];

    return {
      verdict: "entitled",
      latestStatus: planSubscription.status,
      planInfo: getSubscriptionPlanInfo(planSubscription),
      grantsSystemCredentials: entitling.some(
        subscriptionGrantsSystemCredentials,
      ),
    };
  }

  const emptyPlanInfo = getSubscriptionPlanInfo(null);

  if (subscriptions.length === 0) {
    return {
      verdict: "immediate_revoke",
      latestStatus: null,
      planInfo: emptyPlanInfo,
      grantsSystemCredentials: false,
    };
  }

  // Nothing entitling. If every remaining subscription is a hard stop, revoke
  // now; if any is payment-failure-shaped, that path owns the decision so the
  // grace period still applies.
  const paymentFailure = subscriptions.find(
    (sub) => !IMMEDIATE_REVOKE_STATUSES.includes(sub.status),
  );

  return {
    verdict: paymentFailure ? "payment_failure" : "immediate_revoke",
    latestStatus: (paymentFailure ?? subscriptions[0]).status,
    planInfo: emptyPlanInfo,
    // A team inside its grace period keeps whatever the failing subscription
    // granted, so this reports what that subscription *would* grant. Callers
    // only consult it when enabling, and the revoke path leaves it false, so
    // this can never over-grant.
    grantsSystemCredentials: paymentFailure
      ? subscriptionGrantsSystemCredentials(paymentFailure)
      : false,
  };
}

/**
 * Answers "what access should this customer have right now?" from live Stripe
 * state rather than from a webhook event payload.
 *
 * Reading through to Stripe on every event is what makes the webhook safe
 * against replays and out-of-order delivery: the event is only a trigger, so a
 * late `customer.subscription.updated` carrying a stale `active` status can no
 * longer resurrect a churned team's keys.
 */
export async function resolveSubscriptionEntitlement(
  stripeCustomerId: string | null | undefined,
): Promise<SubscriptionEntitlement> {
  if (!stripeCustomerId) {
    return reduceSubscriptionsToEntitlement([]);
  }

  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined = undefined;

  // Paginate rather than `limit: 1` — the whole point is to see every
  // subscription, not the newest one.
  for (;;) {
    const page: Stripe.ApiList<Stripe.Subscription> =
      await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

    subscriptions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }

  return reduceSubscriptionsToEntitlement(subscriptions);
}
