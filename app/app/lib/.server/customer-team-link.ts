import { createSupabaseServiceRoleClient } from "~/lib/.server/supabase";

/** What happened, for the caller's log. `linked` is the only state change. */
export type CustomerTeamLinkOutcome =
  | "already-linked"
  | "linked"
  | "no-team-id"
  | "team-not-found";

export interface CustomerTeamLinkResult {
  outcome: CustomerTeamLinkOutcome;
  teamId: null | string;
}

/**
 * Bind a Stripe customer to its team — `teams.stripe_customer_id`.
 *
 * ONE outcome, deliberately: everything downstream (billing portal, the
 * subscription-access sweep, the temp-key gate) finds a team by its customer
 * id, so the link is the join key the rest of billing depends on.
 *
 * The team comes from `customer.metadata.team_id`, which the dashboard stamps
 * when it creates the customer. The checkout callback links the same field the
 * moment Checkout returns; this is the path for customers created any OTHER way
 * (made directly in Stripe, or a session the user abandoned before the
 * redirect), which nothing covered before.
 *
 * Writes only when the column is NULL, so it can never clobber an existing link
 * or move a team to a different customer — re-delivery is a no-op. Uses the
 * SERVICE-ROLE client: a webhook has no session, and the write crosses team
 * boundaries by design.
 */
export async function linkCustomerToTeam(
  stripeCustomerId: string,
  teamId: null | string | undefined,
): Promise<CustomerTeamLinkResult> {
  if (!teamId) return { outcome: "no-team-id", teamId: null };

  const supabase = createSupabaseServiceRoleClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, stripe_customer_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) return { outcome: "team-not-found", teamId };
  if (team.stripe_customer_id) return { outcome: "already-linked", teamId };

  const { error } = await supabase
    .from("teams")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", teamId)
    .is("stripe_customer_id", null);
  if (error) throw error;

  return { outcome: "linked", teamId };
}
