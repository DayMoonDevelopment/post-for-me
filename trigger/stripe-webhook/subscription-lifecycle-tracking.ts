import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "../supabase.types";
import { captureServerEvent, deterministicUuid, setTeamGroupProperties } from "../posthog";
import { getSubscriptionPlanInfo, PRICING_TIERS, stripe } from "./billing";

// Vendored from dashboard's subscription lifecycle tracker. Analytics callers
// should catch failures so preparation errors do not block billing side effects.
type SubscriptionEvent =
  | Stripe.CustomerSubscriptionCreatedEvent
  | Stripe.CustomerSubscriptionUpdatedEvent
  | Stripe.CustomerSubscriptionDeletedEvent;

export type TeamRow = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "created_by" | "name" | "billing_email"
>;
const TEAM_SELECT = "id, created_by, name, billing_email";

export async function resolveTeam(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<TeamRow | null> {
  const teamId = subscription.metadata?.team_id;
  if (teamId) {
    const { data, error } = await supabaseServiceRole
      .from("teams").select(TEAM_SELECT).eq("id", teamId).maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer : subscription.customer.id;
  const { data, error } = await supabaseServiceRole
    .from("teams").select(TEAM_SELECT).eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function trackSubscriptionLifecycle(
  event: SubscriptionEvent,
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<void> {
  const subscription = event.data.object;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer : subscription.customer.id;
  const team = await resolveTeam(subscription, supabaseServiceRole);
  if (!team?.created_by) return;

  const distinctId = team.created_by;
  const planInfo = getSubscriptionPlanInfo(subscription);
  const status = subscription.status;
  const isActive = status === "active" || status === "trialing";
  // Always use Stripe's original time, including on retries/resends.
  const timestamp = new Date(event.created * 1000);
  const baseProps = {
    team_id: team.id,
    stripe_customer_id: customerId,
    subscription_id: subscription.id,
    plan_name: planInfo.planName,
    plan_post_limit: planInfo.postLimit,
    plan_price: planInfo.price,
    price: planInfo.price,
    currency: (subscription.currency ?? "usd").toUpperCase(),
    is_legacy: planInfo.isLegacy,
  };

  await setTeamGroupProperties(team.id, {
    name: team.name,
    subscription_status: status,
    plan_name: planInfo.planName,
    plan_post_limit: planInfo.postLimit,
    plan_price: planInfo.price,
    is_active: event.type === "customer.subscription.deleted" ? false : isActive,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
  });

  if (event.type === "customer.subscription.deleted") {
    await captureServerEvent({
      distinctId, event: "subscription_canceled", teamId: team.id,
      properties: baseProps,
      dedupeKey: deterministicUuid(`subscription_canceled:${subscription.id}`),
      timestamp,
    });
    return;
  }

  if (isActive) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId, status: "all", limit: 100,
    });
    const hasPriorRealSubscription = subscriptions.data.some((candidate) =>
      candidate.id !== subscription.id &&
      candidate.status !== "incomplete" && candidate.status !== "incomplete_expired",
    );
    // Trialing counts as converted until trials are offered, as in dashboard.
    const eventName = hasPriorRealSubscription ? "subscription_reactivated" : "customer_converted";
    await captureServerEvent({
      distinctId, event: eventName, teamId: team.id,
      properties: { ...baseProps, ...adAttributionProps(subscription.metadata) },
      dedupeKey: deterministicUuid(`${eventName}:${subscription.id}`), timestamp,
    });
  }

  if (event.type !== "customer.subscription.updated") return;
  const previous = event.data.previous_attributes;
  if (subscription.cancel_at_period_end === true && previous?.cancel_at_period_end === false) {
    await captureServerEvent({
      distinctId, event: "subscription_cancel_scheduled", teamId: team.id,
      properties: { ...baseProps, cancel_at: subscription.cancel_at },
      dedupeKey: deterministicUuid(`subscription_cancel_scheduled:${subscription.id}:${subscription.cancel_at}`),
      timestamp,
    });
  }

  const currentPostLimit = planInfo.postLimit;
  if (currentPostLimit == null) return;
  const previousItems = (previous as
    | { items?: { data?: Array<{ price?: { product?: unknown } }> } }
    | undefined)?.items?.data;
  if (!previousItems?.length) return;
  const previousPostLimit = previousItems.map((item) => {
    const product = item.price?.product;
    const productId = typeof product === "string" ? product
      : product && typeof product === "object" && "id" in product
        ? (product as { id: string }).id : null;
    return PRICING_TIERS.find((tier) => tier.productId === productId)?.posts ?? null;
  }).find((limit) => limit != null) ?? null;
  if (previousPostLimit == null || previousPostLimit === currentPostLimit) return;

  const eventName = currentPostLimit > previousPostLimit ? "subscription_upgraded" : "subscription_downgraded";
  await captureServerEvent({
    distinctId, event: eventName, teamId: team.id,
    properties: { ...baseProps, from_post_limit: previousPostLimit, to_post_limit: currentPostLimit },
    dedupeKey: deterministicUuid(`${eventName}:${subscription.id}:${previousPostLimit}:${currentPostLimit}`),
    timestamp,
  });
}

function adAttributionProps(metadata: Stripe.Metadata | null | undefined): Record<string, unknown> {
  if (!metadata) return {};
  const props: Record<string, unknown> = {};
  for (const key of ["gclid", "fbclid", "fbc", "fbp", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    if (metadata[key]) props[key] = metadata[key];
  }
  if (metadata.current_url) props.$current_url = metadata.current_url;
  if (metadata.user_agent) props.$raw_user_agent = metadata.user_agent;
  return props;
}
