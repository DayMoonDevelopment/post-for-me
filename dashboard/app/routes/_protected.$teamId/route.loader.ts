import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import { customerHasActiveSubscriptions } from "~/lib/.server/customer-has-active-subscriptions.request";
import { customerHasSubscriptionSystemCredsAddon } from "~/lib/.server/customer-has-subscription-system-creds-addon.request";
import { customerHasLegacyPlan } from "~/lib/.server/customer-has-legacy-plan.request";

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
      .select("team:teams!inner(id, name, billing_email, stripe_customer_id)")
      .eq("user_id", currentUser.data.user.id),
    supabase.from("projects").select("id, name, team_id").eq("team_id", teamId),
  ]);

  const allTeams = teams.data?.map(({ team }) => team) || [];
  const team = allTeams.find((team) => team.id === teamId);

  if (!team) {
    return new Response("Team not found", { status: 404 });
  }

  const [hasActiveSubscription, hasSystemCredsAddon, hasLegacyPlan] =
    await Promise.all([
      customerHasActiveSubscriptions(team?.stripe_customer_id),
      customerHasSubscriptionSystemCredsAddon(team?.stripe_customer_id),
      customerHasLegacyPlan(team?.stripe_customer_id),
    ]);

  return data({
    team,
    teams: allTeams,
    projects: projects.data || [],
    user: currentUser.data.user,
    billing: {
      active: hasActiveSubscription,
      creds_addon: hasSystemCredsAddon,
      legacy: hasLegacyPlan,
    },
  });
});
