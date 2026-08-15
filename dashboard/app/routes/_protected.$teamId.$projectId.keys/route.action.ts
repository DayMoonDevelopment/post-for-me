import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import { unkey } from "~/lib/.server/unkey";
import { RATE_LIMITS, UNKEY_API_ID } from "~/lib/.server/unkey.constants";
import { resolveSubscriptionEntitlement } from "~/lib/.server/resolve-subscription-entitlement.request";
import { planMetadataFromPlanInfo } from "~/lib/.server/get-subscription-plan-info";

export const action = withSupabase(async ({ supabase, params }) => {
  const { teamId, projectId } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  const [team, project] = await Promise.all([
    supabase
      .from("teams")
      .select("stripe_customer_id")
      .eq("id", teamId)
      .single(),
    supabase.from("projects").select("is_system").eq("id", projectId).single(),
  ]);

  if (!team.data || !project.data) {
    return data({ success: false, error: "Not found", result: null });
  }

  // Same verdict the Stripe webhook and reconcile sweep act on, and the same
  // per-project rule updateAPIKeyAccess applies, so a key can be minted exactly
  // when the sweep would leave it enabled. The previous `status: "active"`
  // lookups disagreed on both counts: they refused to mint for a trialing team
  // or one inside its payment grace window, even though enforcement was keeping
  // that team's existing keys working.
  const entitlement = await resolveSubscriptionEntitlement(
    team.data.stripe_customer_id,
  );

  if (entitlement.verdict === "immediate_revoke") {
    return data({
      success: false,
      toast_msg: "You must have an active subscription to create an API key",
      result: null,
    });
  }

  if (project.data.is_system && !entitlement.grantsSystemCredentials) {
    return data({
      success: false,
      toast_msg:
        "Your plan doesn't include managed social app credentials. Upgrade to create a key for this project.",
      result: null,
    });
  }

  const planMetadata = planMetadataFromPlanInfo(entitlement.planInfo);

  try {
    const apiKey = await unkey.keys.createKey({
      apiId: UNKEY_API_ID,
      prefix: "pfm_live",
      name: "API Key",
      externalId: projectId,
      meta: {
        project_id: projectId,
        team_id: teamId,
        created_by: currentUser.data.user.id,
        ...planMetadata,
      },
      enabled: true,
      recoverable: false,
      ratelimits: RATE_LIMITS,
    });

    return data({
      success: true,
      error: null,
      result: {
        key: apiKey.data.key,
      },
    });
  } catch (error) {
    return data({
      success: false,
      error: (error as { message?: string }).message,
      result: null,
    });
  }
});
