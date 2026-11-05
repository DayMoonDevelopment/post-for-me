import { Unkey } from "@unkey/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database } from "../supabase.types";
import { getSubscriptionPlanInfo, PRICING_TIERS, stripe } from "./billing";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

export async function reconcileAPIKeys(
  customerId: string,
  supabase: SupabaseClient<Database>,
): Promise<Stripe.Subscription[]> {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (teamError) throw teamError;
  if (!team) {
    // Customer linking can arrive after subscription events. Retrieve current
    // metadata rather than silently dropping the access update.
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.metadata.team_id) return [];
    const { error } = await supabase.from("teams")
      .update({ stripe_customer_id: customerId })
      .eq("id", customer.metadata.team_id)
      .is("stripe_customer_id", null);
    if (error) throw error;
    const { data: linkedTeam, error: linkError } = await supabase.from("teams")
      .select("id").eq("stripe_customer_id", customerId).maybeSingle();
    if (linkError) throw linkError;
    if (!linkedTeam) throw new Error(`Unable to link Stripe customer ${customerId}`);
    return reconcileAPIKeys(customerId, supabase);
  }

  // Never apply the historical subscription status from a retried webhook.
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.subscriptions.list({
      customer: customerId, status: "all", limit: 100, starting_after: startingAfter,
    });
    subscriptions.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  const eligible = subscriptions.filter((sub) => sub.status === "active" || sub.status === "trialing");
  const active = eligible.filter((sub) => sub.status === "active");
  const hasSystemCredentials = active.some((sub) => sub.items.data.some((item) => {
    const productId = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
    return PRICING_TIERS.some((tier) => tier.productId === productId) ||
      item.price.metadata.allows_system_credentials_access === "true";
  }));
  const planInfo = getSubscriptionPlanInfo(active[0] ?? null);
  const planMetadata: Record<string, string> = {};
  if (active.length) {
    if (planInfo.productId) planMetadata.plan_product_id = planInfo.productId;
    if (planInfo.planName) planMetadata.plan_name = planInfo.planName;
    if (planInfo.postLimit) planMetadata.plan_post_limit = String(planInfo.postLimit);
    planMetadata.plan_type = planInfo.isNewPricing ? "new_pricing" : planInfo.isLegacy ? "legacy" : "unknown";
  }

  let offset = 0;
  while (true) {
    const { data: projects, error } = await supabase.from("projects")
      .select("id, is_system").eq("team_id", team.id)
      .order("id").range(offset, offset + 999);
    if (error) throw error;
    for (const project of projects ?? []) {
      let cursor: string | undefined;
      do {
        const keys = await unkey.apis.listKeys({
          apiId: process.env.UNKEY_API_ID!, externalId: project.id,
          limit: 100, cursor, revalidateKeysCache: true,
        });
        if (!keys.data) throw new Error(`Missing key list for ${project.id}`);
        for (let i = 0; i < keys.data.length; i += 10) {
          // Settle the entire batch before failing, so no outstanding writes
          // escape the customer's serialized task run.
          const results = await Promise.allSettled(keys.data.slice(i, i + 10).map(async (key) => {
            await unkey.keys.updateKey({
              keyId: key.keyId,
              enabled: eligible.length > 0 && (!project.is_system || hasSystemCredentials),
              meta: { ...key.meta, ...planMetadata },
            });
          }));
          const failure = results.find((result) => result.status === "rejected");
          if (failure?.status === "rejected") throw failure.reason;
        }
        const nextCursor = keys.pagination?.hasMore ? keys.pagination.cursor : undefined;
        if (keys.pagination?.hasMore && (!nextCursor || nextCursor === cursor)) {
          throw new Error(`Invalid key pagination for ${project.id}`);
        }
        cursor = nextCursor;
      } while (cursor);
    }
    if (!projects || projects.length < 1000) break;
    offset += projects.length;
  }
  console.log("Reconciled API keys", { customerId, teamId: team.id, enabled: eligible.length > 0 });
  return eligible;
}
