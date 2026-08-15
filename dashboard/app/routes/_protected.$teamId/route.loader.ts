import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import {
  resolveSubscriptionEntitlement,
  type SubscriptionEntitlement,
} from "~/lib/.server/resolve-subscription-entitlement.request";
import { PAYMENT_GRACE_PERIOD_DAYS } from "~/lib/.server/stripe.constants";

export const loader = withSupabase(async ({ supabase, params }) => {
  const { teamId } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  const [teams, projects] = await Promise.all([
    supabase
      .from("team_users")
      .select(
        "team:teams!inner(id, name, billing_email, stripe_customer_id, payment_failed_at)",
      )
      .eq("user_id", currentUser.data.user.id),
    supabase.from("projects").select("id, name, team_id").eq("team_id", teamId),
  ]);

  const allTeams = teams.data?.map(({ team }) => team) || [];
  const team = allTeams.find((team) => team.id === teamId);

  if (!team) {
    return new Response("Team not found", { status: 404 });
  }

  // One resolution instead of three `status: "active"` lookups. Those disagreed
  // with the enforcement path — they treated a trialing team, and a team inside
  // its payment grace window, as having no subscription, so the dashboard told
  // them to set up billing while their API keys were working fine.
  const entitlement = await resolveSubscriptionEntitlement(
    team.stripe_customer_id,
  );

  return data({
    team,
    teams: allTeams,
    projects: projects.data || [],
    user: currentUser.data.user,
    billing: {
      active: entitlement.verdict !== "immediate_revoke",
      creds_addon: entitlement.grantsSystemCredentials,
      legacy: entitlement.planInfo.isLegacy,
      // Non-null only while a payment has failed and access is still being
      // honoured, so the UI can say "your payment failed, fix it by <date>"
      // rather than either "all good" or "set up billing".
      grace: resolveGracePeriod(team.payment_failed_at, entitlement.verdict),
    },
  });
});

/**
 * When a team's access is revoked over a failed payment, or `null` when no
 * payment has failed.
 *
 * `expired` covers the gap between the deadline passing and the hourly sweep
 * actually revoking: the keys still work, so gating the UI would be a lie, but
 * so would "you have until <date>". Reported rather than hidden — going quiet
 * for up to an hour at the moment access is about to end is the worst of the
 * three options.
 */
function resolveGracePeriod(
  paymentFailedAt: string | null,
  verdict: SubscriptionEntitlement["verdict"],
): { deadline: string; expired: boolean } | null {
  if (verdict !== "payment_failure" || !paymentFailedAt) {
    return null;
  }

  const deadline =
    new Date(paymentFailedAt).getTime() +
    PAYMENT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  if (!Number.isFinite(deadline)) {
    return null;
  }

  return {
    deadline: new Date(deadline).toISOString(),
    expired: deadline <= Date.now(),
  };
}
