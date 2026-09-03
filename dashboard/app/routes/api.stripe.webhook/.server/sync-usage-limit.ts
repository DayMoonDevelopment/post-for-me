import { stripe } from "~/lib/.server/stripe";
import {
  releaseSchedulesForCustomer,
  SCHEDULE_TYPE,
} from "~/lib/.server/subscription-schedules";

import { resolveTeam } from "./subscription-lifecycle-tracking";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";

type UsageWindow =
  Database["public"]["Tables"]["social_post_team_usage"]["Row"];

// Vendored from trigger/backfill-team-usage.ts — dashboard and trigger are
// separate siblings with no shared package, so this pattern is copied rather
// than imported. `product.metadata.social_post_limit` is the actual source
// of truth for `social_post_team_usage.limit` (unlike `PRICING_TIERS`, which
// is display/tier-ordering only).
const getSubscriptionItemProduct = async (
  item: Stripe.SubscriptionItem,
): Promise<Stripe.Product> => {
  const product = item.price.product;
  const productId = typeof product === "string" ? product : product.id;

  const retrievedProduct = await stripe.products.retrieve(productId);

  if ("deleted" in retrievedProduct && retrievedProduct.deleted) {
    throw new Error("Subscription product is deleted");
  }

  return retrievedProduct;
};

const getSubscriptionLimitDetails = async (
  subscription: Stripe.Subscription,
): Promise<{ limit: number; item: Stripe.SubscriptionItem }> => {
  for (const item of subscription.items.data) {
    const product = await getSubscriptionItemProduct(item);
    const limitValue = product.metadata.social_post_limit;
    const limit = Number(limitValue);

    if (limitValue && Number.isFinite(limit) && limit > 0) {
      return { limit, item };
    }
  }

  throw new Error(
    "No subscription item has valid social_post_limit metadata",
  );
};

const getLatestUsageWindow = async (
  teamId: string,
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<UsageWindow | null> => {
  const { data, error } = await supabaseServiceRole
    .from("social_post_team_usage")
    .select("team_id, count, limit, start_at, end_at")
    .eq("team_id", teamId)
    .order("end_at", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Apply a mid-period Stripe tier upgrade to the team's currently open usage
 * window immediately, instead of leaving it flagged "exceeded" against the
 * old cap until the window rolls over. Also releases any pending
 * `usage_based_upgrade` schedule (see trigger/process-usage-limits.ts) for
 * the customer, since the manual upgrade this webhook just applied makes
 * that scheduled bump redundant.
 *
 * Downgrades are intentionally left alone — nothing writes `limit` on a
 * downgrade today, so this only ever raises the cap, never lowers it.
 */
export async function syncTeamUsageLimitOnUpgrade(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<void> {
  const team = await resolveTeam(subscription, supabaseServiceRole);

  if (!team) {
    return;
  }

  let newLimit: number;
  try {
    ({ limit: newLimit } = await getSubscriptionLimitDetails(subscription));
  } catch (error) {
    console.error(
      "Could not resolve social_post_limit for subscription, skipping usage limit sync:",
      error,
    );
    return;
  }

  const window = await getLatestUsageWindow(team.id, supabaseServiceRole);

  if (!window) {
    return;
  }

  const isOpen = new Date(window.end_at).getTime() > Date.now();
  if (!isOpen) {
    return;
  }

  if (newLimit <= window.limit) {
    return;
  }

  const { error: updateError } = await supabaseServiceRole
    .from("social_post_team_usage")
    .update({ limit: newLimit })
    .eq("team_id", team.id)
    .eq("start_at", window.start_at)
    .eq("end_at", window.end_at);

  if (updateError) {
    throw updateError;
  }

  const customerId = subscription.customer as string;
  await releaseSchedulesForCustomer({
    stripeCustomerId: customerId,
    criteria: { mode: "matching", type: SCHEDULE_TYPE.USAGE_BASED_UPGRADE },
  });

  console.log("Applied mid-period usage limit upgrade", {
    team_id: team.id,
    previous_limit: window.limit,
    new_limit: newLimit,
  });
}
