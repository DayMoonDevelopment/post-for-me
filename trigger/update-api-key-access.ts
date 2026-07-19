import { Unkey } from "@unkey/api";
import Stripe from "stripe";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });
const UNKEY_API_ID = process.env.UNKEY_API_ID!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Same "which product IDs include system credentials access" check dashboard's
// customer-has-subscription-system-creds-addon.request.ts does. Duplicated
// (not imported) per this repo's dumb-monorepo rule.
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

async function customerHasSubscriptionSystemCredsAddon(
  stripeCustomerId: string | null | undefined,
): Promise<boolean> {
  if (!stripeCustomerId) return false;

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
  });

  return subscriptions.data.some((sub) => {
    if (sub.status !== "active") return false;

    return sub.items?.data?.some((item) => {
      const productId = item.price.product as string;

      if (NEW_PRICING_TIER_PRODUCT_IDS.includes(productId)) return true;

      return (
        item.price?.metadata?.allows_system_credentials_access === "true"
      );
    });
  });
}

/**
 * Trigger-local copy of dashboard/app/lib/.server/update-api-key-access.request.ts's
 * Unkey key-toggle logic, used by process-payment-grace-period.ts. Vendored
 * rather than imported per this repo's dumb-monorepo rule (no cross-sibling
 * imports) — keep both in sync if Unkey enable/disable behavior changes.
 */
export async function updateApiKeyAccess(
  { teamId, enabled }: { teamId: string; enabled: boolean },
  supabaseClient: SupabaseClient<Database>,
): Promise<void> {
  const team = await supabaseClient
    .from("teams")
    .select("id, stripe_customer_id")
    .eq("id", teamId)
    .maybeSingle();

  if (team.error || !team.data) {
    console.error(`Failed to find team ${teamId}:`, team.error);
    return;
  }

  const hasSystemCredentialsAddon = enabled
    ? await customerHasSubscriptionSystemCredsAddon(
        team.data.stripe_customer_id,
      )
    : false;

  const projects = await supabaseClient
    .from("projects")
    .select("id, is_system")
    .eq("team_id", teamId);

  if (projects.error) {
    console.error(`Failed to find projects for team ${teamId}:`, projects.error);
    return;
  }

  if (!projects.data || projects.data.length === 0) {
    return;
  }

  for (const project of projects.data) {
    const projectEnabled = project.is_system
      ? enabled && hasSystemCredentialsAddon
      : enabled;

    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const apiKeys = await unkey.apis.listKeys({
        apiId: UNKEY_API_ID,
        externalId: project.id,
        limit: 100,
        cursor,
        revalidateKeysCache: true,
      });

      if (!apiKeys.data || apiKeys.data.length === 0) break;

      const batchSize = 10;
      for (let i = 0; i < apiKeys.data.length; i += batchSize) {
        const batch = apiKeys.data.slice(i, i + batchSize);
        await Promise.all(
          batch.map((key) =>
            unkey.keys.updateKey({ keyId: key.keyId, enabled: projectEnabled }),
          ),
        );
      }

      cursor = apiKeys.pagination?.cursor;
      hasMore = apiKeys.pagination?.hasMore || false;
    }
  }
}
