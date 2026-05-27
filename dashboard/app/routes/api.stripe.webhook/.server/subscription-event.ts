import { getSubscriptionPlanInfo } from "~/lib/.server/get-subscription-plan-info";
import {
  captureServerEvent,
  deterministicUuid,
  setTeamGroupProperties,
} from "~/lib/.server/posthog";
import { stripe } from "~/lib/.server/stripe";
import { PRICING_TIERS } from "~/lib/.server/stripe.constants";
import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";

type TeamRow = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "created_by" | "name" | "billing_email"
>;

export async function handleSubscriptionEvent(
  event: Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent,
  supabaseServiceRole: SupabaseClient<Database>
) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;
  const status = subscription.status;

  const isSubscriptionActive = status === "active" || status === "trialing";

  // Existing behavior: enable/disable API keys based on subscription status.
  await updateAPIKeyAccess(
    {
      stripeCustomerId: customerId,
      enabled: isSubscriptionActive,
    },
    supabaseServiceRole
  );

  // Lifecycle analytics. Best-effort: never let a tracking failure break the
  // Unkey side effect above or the webhook response.
  try {
    await trackSubscriptionLifecycle(event, supabaseServiceRole);
  } catch (error) {
    console.error("Failed to track subscription lifecycle in PostHog:", error);
  }
}

const TEAM_SELECT = "id, created_by, name, billing_email";

/**
 * Resolve the team for a subscription. Prefer the `team_id` we stamp onto the
 * subscription metadata at checkout — that's reliable even before
 * `teams.stripe_customer_id` is linked (that link races the post-checkout
 * redirect, which would otherwise drop a brand-new customer's conversion).
 * Fall back to the customer-id lookup for existing/older subscriptions.
 */
async function resolveTeam(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>
): Promise<TeamRow | null> {
  const teamId = subscription.metadata?.team_id;
  if (teamId) {
    const { data } = await supabaseServiceRole
      .from("teams")
      .select(TEAM_SELECT)
      .eq("id", teamId)
      .maybeSingle();
    if (data) {
      return data;
    }
  }

  const customerId = subscription.customer as string;
  const { data } = await supabaseServiceRole
    .from("teams")
    .select(TEAM_SELECT)
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data ?? null;
}

function productIdFromUnknown(product: unknown): string | null {
  if (typeof product === "string") {
    return product;
  }
  if (product && typeof product === "object" && "id" in product) {
    return (product as { id: string }).id;
  }
  return null;
}

/**
 * Map a Stripe product to the number of posts its plan allows. This is how we
 * order/distinguish plans internally — a higher limit is a higher plan. Returns
 * null for products that aren't one of our pricing tiers (legacy/unknown).
 */
function postLimitForProduct(productId: string | null): number | null {
  if (!productId) {
    return null;
  }
  return PRICING_TIERS.find((tier) => tier.productId === productId)?.posts ?? null;
}

async function trackSubscriptionLifecycle(
  event: Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent,
  supabaseServiceRole: SupabaseClient<Database>
): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;

  const team = await resolveTeam(subscription, supabaseServiceRole);

  // Without a team + creator we have no person to attribute the event to.
  if (!team?.created_by) {
    return;
  }

  const distinctId = team.created_by;
  const planInfo = getSubscriptionPlanInfo(subscription);
  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";

  // Stamp events with when Stripe emitted them, not ingestion time, so webhook
  // retries and manual resends don't land on the wrong moment in the timeline.
  const eventTimestamp = new Date(event.created * 1000);

  const baseProps = {
    team_id: team.id,
    stripe_customer_id: customerId,
    subscription_id: subscription.id,
    plan_name: planInfo.planName,
    plan_post_limit: planInfo.postLimit,
    plan_price: planInfo.price,
    is_legacy: planInfo.isLegacy,
  };

  // Keep the team group's current billing state fresh on every event, so
  // "is_active" / "subscription_status" stay correct even if a discrete event
  // is missed.
  await setTeamGroupProperties(team.id, {
    name: team.name,
    subscription_status: status,
    plan_name: planInfo.planName,
    plan_post_limit: planInfo.postLimit,
    plan_price: planInfo.price,
    is_active: event.type === "customer.subscription.deleted" ? false : isActive,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
  });

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      if (isActive) {
        await maybeTrackConversionOrReactivation({
          subscription,
          customerId,
          distinctId,
          teamId: team.id,
          baseProps,
          eventTimestamp,
        });
      }

      if (event.type === "customer.subscription.updated") {
        await maybeTrackCancelScheduled({
          event,
          subscription,
          distinctId,
          teamId: team.id,
          baseProps,
          eventTimestamp,
        });
        await maybeTrackTierChange({
          event,
          subscription,
          currentPostLimit: planInfo.postLimit,
          distinctId,
          teamId: team.id,
          baseProps,
          eventTimestamp,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      await captureServerEvent({
        distinctId,
        event: "subscription_canceled",
        teamId: team.id,
        properties: baseProps,
        dedupeKey: deterministicUuid(
          `subscription_canceled:${subscription.id}`
        ),
        timestamp: eventTimestamp,
      });
      break;
    }
  }
}

/**
 * On the first active/trialing subscription, fire `customer_converted`. If the
 * customer had a prior *real* subscription (they churned and came back), fire
 * `subscription_reactivated` instead. Abandoned-checkout `incomplete` subs don't
 * count as prior, so they never mask a genuine first conversion. Keyed off the
 * subscription id so the same milestone seen via `.created` and a later
 * `.updated` only counts once.
 *
 * NOTE: `trialing` currently counts as converted because we don't offer trials.
 * If/when we do, track trial starts separately (e.g. `trial_started`) and
 * redefine `customer_converted` as the first *paid* subscription.
 */
async function maybeTrackConversionOrReactivation({
  subscription,
  customerId,
  distinctId,
  teamId,
  baseProps,
  eventTimestamp,
}: {
  subscription: Stripe.Subscription;
  customerId: string;
  distinctId: string;
  teamId: string;
  baseProps: Record<string, unknown>;
  eventTimestamp: Date;
}): Promise<void> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  const hasPriorRealSubscription = subscriptions.data.some(
    (candidate) =>
      candidate.id !== subscription.id &&
      candidate.status !== "incomplete" &&
      candidate.status !== "incomplete_expired",
  );

  const event = hasPriorRealSubscription
    ? "subscription_reactivated"
    : "customer_converted";

  await captureServerEvent({
    distinctId,
    event,
    teamId,
    properties: baseProps,
    dedupeKey: deterministicUuid(`${event}:${subscription.id}`),
    timestamp: eventTimestamp,
  });
}

/**
 * Fire `subscription_cancel_scheduled` when `cancel_at_period_end` flips true —
 * i.e. someone (user or support) requested cancellation at period end while the
 * subscription is still active.
 */
async function maybeTrackCancelScheduled({
  event,
  subscription,
  distinctId,
  teamId,
  baseProps,
  eventTimestamp,
}: {
  event: Stripe.CustomerSubscriptionUpdatedEvent;
  subscription: Stripe.Subscription;
  distinctId: string;
  teamId: string;
  baseProps: Record<string, unknown>;
  eventTimestamp: Date;
}): Promise<void> {
  const previous = event.data.previous_attributes as
    | Partial<Stripe.Subscription>
    | undefined;

  const flippedToCancel =
    subscription.cancel_at_period_end === true &&
    previous?.cancel_at_period_end === false;

  if (!flippedToCancel) {
    return;
  }

  await captureServerEvent({
    distinctId,
    event: "subscription_cancel_scheduled",
    teamId,
    properties: { ...baseProps, cancel_at: subscription.cancel_at },
    dedupeKey: deterministicUuid(
      `subscription_cancel_scheduled:${subscription.id}:${subscription.cancel_at}`
    ),
    timestamp: eventTimestamp,
  });
}

/**
 * Fire `subscription_upgraded` / `subscription_downgraded` when the plan changes.
 * Plans are ordered by their post limit (how many posts the plan allows) — that's
 * how we distinguish tiers internally, so a higher limit is an upgrade. The prior
 * plan comes from `previous_attributes.items`; if it isn't resolvable we skip
 * rather than guess.
 */
async function maybeTrackTierChange({
  event,
  subscription,
  currentPostLimit,
  distinctId,
  teamId,
  baseProps,
  eventTimestamp,
}: {
  event: Stripe.CustomerSubscriptionUpdatedEvent;
  subscription: Stripe.Subscription;
  currentPostLimit: number | null;
  distinctId: string;
  teamId: string;
  baseProps: Record<string, unknown>;
  eventTimestamp: Date;
}): Promise<void> {
  if (currentPostLimit == null) {
    return;
  }

  const previous = event.data.previous_attributes as
    | { items?: { data?: Array<{ price?: { product?: unknown } }> } }
    | undefined;

  const previousItems = previous?.items?.data;
  if (!previousItems || previousItems.length === 0) {
    return;
  }

  const previousPostLimit =
    previousItems
      .map((item) =>
        postLimitForProduct(productIdFromUnknown(item.price?.product)),
      )
      .find((postLimit) => postLimit != null) ?? null;

  if (previousPostLimit == null || previousPostLimit === currentPostLimit) {
    return;
  }

  const eventName =
    currentPostLimit > previousPostLimit
      ? "subscription_upgraded"
      : "subscription_downgraded";

  await captureServerEvent({
    distinctId,
    event: eventName,
    teamId,
    properties: {
      ...baseProps,
      from_post_limit: previousPostLimit,
      to_post_limit: currentPostLimit,
    },
    dedupeKey: deterministicUuid(
      `${eventName}:${subscription.id}:${previousPostLimit}:${currentPostLimit}`
    ),
    timestamp: eventTimestamp,
  });
}
