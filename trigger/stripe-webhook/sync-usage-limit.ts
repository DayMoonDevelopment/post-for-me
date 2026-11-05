import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "../supabase.types";
import { stripe, releaseSchedulesForCustomer, SCHEDULE_TYPE } from "./billing";
import { resolveTeam } from "./subscription-lifecycle-tracking";

// Product metadata, not the display pricing tiers, is authoritative for usage.
async function getSubscriptionLimit(subscription: Stripe.Subscription): Promise<number | null> {
  for (const item of subscription.items.data) {
    const product = item.price.product;
    const productId = typeof product === "string" ? product : product.id;
    const retrievedProduct = await stripe.products.retrieve(productId);
    if ("deleted" in retrievedProduct && retrievedProduct.deleted) {
      throw new Error("Subscription product is deleted");
    }
    const limitValue = retrievedProduct.metadata.social_post_limit;
    const limit = Number(limitValue);
    if (limitValue && Number.isFinite(limit) && limit > 0) return limit;
  }
  // Missing metadata is not an infrastructure failure and must not cause retries.
  return null;
}

/** Raise an open usage window's cap using the CURRENT subscription supplied by
 * the caller, never an old webhook snapshot. Downgrades never lower the cap. */
export async function syncTeamUsageLimitOnUpgrade(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<void> {
  const team = await resolveTeam(subscription, supabaseServiceRole);
  if (!team) return;
  const newLimit = await getSubscriptionLimit(subscription);
  if (newLimit === null) return;

  const { data: window, error } = await supabaseServiceRole
    .from("social_post_team_usage")
    .select("team_id, count, limit, start_at, end_at")
    .eq("team_id", team.id)
    .order("end_at", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!window || !(new Date(window.end_at).getTime() > Date.now())) return;
  if (newLimit <= window.limit) return;

  // Release first so a failure at either step leaves the old cap for retries.
  // Equality must not release legitimate upgrades on unrelated Stripe updates.
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer : subscription.customer.id;
  await releaseSchedulesForCustomer({
    stripeCustomerId: customerId,
    criteria: { mode: "matching", type: SCHEDULE_TYPE.USAGE_BASED_UPGRADE },
  });
  const { error: updateError } = await supabaseServiceRole
    .from("social_post_team_usage")
    .update({ limit: newLimit })
    .eq("team_id", team.id)
    .eq("start_at", window.start_at)
    .eq("end_at", window.end_at);
  if (updateError) throw updateError;

  console.log("Applied mid-period usage limit upgrade", {
    team_id: team.id, previous_limit: window.limit, new_limit: newLimit,
  });
}
