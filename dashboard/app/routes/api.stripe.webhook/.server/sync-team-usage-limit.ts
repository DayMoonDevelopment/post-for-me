import { getSubscriptionPlanInfo } from "~/lib/.server/get-subscription-plan-info";
import { resolveTeam } from "./subscription-lifecycle-tracking";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";

/**
 * Push a team's current plan's post-limit into the active usage window
 * immediately, instead of waiting for the window to roll over. No-op if
 * there's no active window yet, or if the plan doesn't resolve to a known
 * limit (legacy/unrecognized product — never write null into a NOT NULL column).
 */
export async function syncTeamUsageLimit(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<void> {
  const planInfo = getSubscriptionPlanInfo(subscription);
  if (planInfo.postLimit == null) return;

  const team = await resolveTeam(subscription, supabaseServiceRole);
  if (!team) return;

  const { error } = await supabaseServiceRole.rpc("sync_team_usage_limit", {
    p_team_id: team.id,
    p_limit: planInfo.postLimit,
  });

  if (error) throw error;
}
