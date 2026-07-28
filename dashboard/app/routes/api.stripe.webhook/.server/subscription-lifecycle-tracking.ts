import { getSubscriptionPlanInfo } from "~/lib/.server/get-subscription-plan-info";
import {
  captureServerEvent,
  deterministicUuid,
  setTeamGroupProperties,
} from "~/tracking/.server/posthog";
import { stripe } from "~/lib/.server/stripe";
import { PRICING_TIERS } from "~/lib/.server/stripe.constants";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";

type SubscriptionEvent =
  | Stripe.CustomerSubscriptionCreatedEvent
  | Stripe.CustomerSubscriptionUpdatedEvent
  | Stripe.CustomerSubscriptionDeletedEvent;

type TeamRow = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "created_by" | "name" | "billing_email"
>;

const TEAM_SELECT = "id, created_by, name, billing_email";

/**
 * Emit PostHog lifecycle events for a Stripe subscription webhook. Called from
 * the webhook handler inside a try/catch — any failure in here is logged but
 * never propagates, so analytics can't break the webhook's primary side effects.
 *
 * Events emitted (per `event.type`):
 *  - `customer_converted` / `subscription_reactivated` — first active or
 *    returning subscription (see `maybeTrackConversionOrReactivation`).
 *  - `subscription_upgraded` / `subscription_downgraded` — plan changes,
 *    ordered by post limit.
 *  - `subscription_cancel_scheduled` — `cancel_at_period_end` flips true.
 *  - `subscription_canceled` — subscription deleted.
 *
 * The `team` group's state properties (`subscription_status`, `is_active`,
 * plan info…) are refreshed on every event, so "is this team active?" is
 * self-healing even if a discrete event is missed.
 */
export async function trackSubscriptionLifecycle(
  event: SubscriptionEvent,
  supabaseServiceRole: SupabaseClient<Database>,
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
    // `price` is an alias of plan_price expected by the PostHog → Meta Ads
    // destination (which reads `event.properties.price` as `custom_data.value`).
    price: planInfo.price,
    currency: (subscription.currency ?? "usd").toUpperCase(),
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
          `subscription_canceled:${subscription.id}`,
        ),
        timestamp: eventTimestamp,
      });
      break;
    }
  }
}

/**
 * Resolve the team for a subscription. Prefer the `team_id` we stamp onto the
 * subscription metadata at checkout — that's reliable even before
 * `teams.stripe_customer_id` is linked (that link races the post-checkout
 * redirect, which would otherwise drop a brand-new customer's conversion).
 * Fall back to the customer-id lookup for existing/older subscriptions.
 */
export async function resolveTeam(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>,
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

/**
 * Pull the ad-attribution + browser-context fields stamped onto the
 * subscription metadata at checkout (`buildSubscriptionMetadata` in the
 * billing loader) and shape them into PostHog event properties. The PostHog
 * → Meta/Google Ads destinations consume these on the `customer_converted` /
 * `subscription_reactivated` events for conversion matching.
 *
 * `$current_url` and `$raw_user_agent` use PostHog's reserved property names so
 * the destinations' default mappings pick them up without configuration.
 */
function adAttributionProps(
  metadata: Stripe.Metadata | null | undefined,
): Record<string, unknown> {
  if (!metadata) return {};
  const props: Record<string, unknown> = {};

  const keys = [
    "gclid",
    "fbclid",
    // `_fbc` / `_fbp` from Meta Pixel; the Meta destination prefers `fbc` over
    // raw `fbclid` and uses `fbp` for the browser-id user-data parameter.
    "fbc",
    "fbp",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const;
  for (const key of keys) {
    if (metadata[key]) props[key] = metadata[key];
  }

  if (metadata.current_url) props.$current_url = metadata.current_url;
  if (metadata.user_agent) props.$raw_user_agent = metadata.user_agent;

  return props;
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
  return (
    PRICING_TIERS.find((tier) => tier.productId === productId)?.posts ?? null
  );
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

  // Enrich the conversion event with what the PostHog → Meta/Google Ads
  // destinations need: ad click IDs, UTMs, the browser's URL + user-agent
  // (captured at checkout-initiation, since this event fires server-side and
  // has no browser context of its own).
  const adProps = adAttributionProps(subscription.metadata);

  await captureServerEvent({
    distinctId,
    event,
    teamId,
    properties: { ...baseProps, ...adProps },
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
      `subscription_cancel_scheduled:${subscription.id}:${subscription.cancel_at}`,
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
      `${eventName}:${subscription.id}:${previousPostLimit}:${currentPostLimit}`,
    ),
    timestamp: eventTimestamp,
  });
}
