import { unkey } from "~/lib/.server/unkey";
import { UNKEY_API_ID } from "~/lib/.server/unkey.constants";
import {
  resolveSubscriptionEntitlement,
  type SubscriptionEntitlement,
} from "./resolve-subscription-entitlement.request";
import { planMetadataFromPlanInfo } from "./get-subscription-plan-info";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/.server/database.types";

type UpdateAPIKeyAccessParams = {
  stripeCustomerId?: string;
  teamId?: string;
  enabled: boolean;
  /**
   * Pre-resolved entitlement, so callers that already read live Stripe state
   * (the webhook path) don't pay for a second round trip. Resolved here when
   * omitted.
   */
  entitlement?: SubscriptionEntitlement;
} & ({ stripeCustomerId: string } | { teamId: string });

/**
 * Brings every Unkey key belonging to a team's projects in line with `enabled`.
 *
 * Idempotent: it re-reads the current key state from Unkey and re-applies the
 * desired state, skipping keys already correct, so it is safe to retry.
 *
 * Throws if any project fails to sync. Callers on the webhook path rely on that
 * to answer 5xx and have Stripe redeliver — the previous behavior of logging
 * and continuing meant a transient Unkey error left a churned team's keys
 * enabled with nothing left to correct it.
 */
export async function updateAPIKeyAccess(
  params: UpdateAPIKeyAccessParams,
  supabaseServiceRole: SupabaseClient<Database>,
) {
  console.log(
    `${params.enabled ? "Enabling" : "Disabling"} API keys for ${
      params.stripeCustomerId
        ? `customer ${params.stripeCustomerId}`
        : `team ${params.teamId}`
    }`,
  );

  const teamQuery = supabaseServiceRole
    .from("teams")
    .select("id, stripe_customer_id");

  const team = await (params.stripeCustomerId
    ? teamQuery.eq("stripe_customer_id", params.stripeCustomerId)
    : teamQuery.eq("id", params.teamId!)
  ).maybeSingle();

  if (team.error) {
    throw new Error(
      `Failed to look up team for ${
        params.stripeCustomerId
          ? `customer ${params.stripeCustomerId}`
          : `team ${params.teamId}`
      }: ${team.error.message}`,
    );
  }

  if (!team.data) {
    throw new Error(
      `No team found for ${
        params.stripeCustomerId
          ? `customer ${params.stripeCustomerId}`
          : `team ${params.teamId}`
      }; cannot sync API key access`,
    );
  }

  const stripeCustomerId = team.data.stripe_customer_id;

  // Resolved from the team's customer id, not from `params`, so this is correct
  // on both lookup paths. Previously it was only computed when the caller
  // passed a stripeCustomerId, so callers passing a teamId silently got `false`
  // and disabled every system-credential key — including while re-enabling an
  // otherwise healthy team.
  const entitlement =
    params.entitlement ??
    (await resolveSubscriptionEntitlement(stripeCustomerId));

  // Only stamp plan metadata on the way up. Keyed off `enabled` rather than the
  // verdict because `payment_failure` reaches here both ways: re-enabling a
  // team inside its grace window (metadata should be reconciled) and revoking
  // one past the deadline (it should not — writing to a key being disabled is
  // pointless churn, and an empty plan would wipe the metadata outright).
  //
  // `immediate_revoke` is excluded on both counts: it carries the empty plan,
  // which would stamp `plan_type: "unknown"` and 401 the team on feeds.
  const planMetadata: Record<string, string> =
    params.enabled && entitlement.verdict !== "immediate_revoke"
      ? planMetadataFromPlanInfo(entitlement.planInfo)
      : {};

  const projects = await supabaseServiceRole
    .from("projects")
    .select("id, is_system")
    .eq("team_id", team.data.id);

  if (projects.error) {
    throw new Error(
      `Failed to find projects for team ${team.data.id}: ${projects.error.message}`,
    );
  }

  if (!projects.data || projects.data.length === 0) {
    console.log(
      `No projects found for team ${team.data.id}, skipping API key updates`,
    );
    return;
  }

  // Collect rather than fail on the first project, so one broken project can't
  // leave the rest of a churned team's keys enabled. Still throws at the end.
  const failures: string[] = [];

  for (const project of projects.data) {
    // Managed-credential projects additionally require the plan to grant system
    // credentials, so restoring access never over-grants.
    const projectEnabled = project.is_system
      ? params.enabled && entitlement.grantsSystemCredentials
      : params.enabled;

    try {
      await syncProjectKeys(project.id, projectEnabled, planMetadata);
    } catch (error) {
      console.error(`Error processing project ${project.id}:`, error);
      failures.push(
        `${project.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to sync API key access for team ${team.data.id} (${failures.length} of ${projects.data.length} projects): ${failures.join("; ")}`,
    );
  }
}

async function syncProjectKeys(
  projectId: string,
  enabled: boolean,
  planMetadata: Record<string, string>,
) {
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    // List all API keys for this project using project_id as external_id
    const apiKeys = await unkey.apis.listKeys({
      apiId: UNKEY_API_ID,
      externalId: projectId,
      limit: 100,
      cursor,
      revalidateKeysCache: true,
    });

    if (!apiKeys.data || !apiKeys.data.length) {
      break;
    }

    // Skip keys already in the desired state so a routine renewal doesn't
    // rewrite every key a team owns.
    const stale = apiKeys.data.filter(
      (key) =>
        key.enabled !== enabled ||
        Object.entries(planMetadata).some(
          ([metaKey, value]) =>
            (key.meta as Record<string, unknown> | undefined)?.[metaKey] !==
            value,
        ),
    );

    const batchSize = 10;
    for (let i = 0; i < stale.length; i += batchSize) {
      const currentBatch = stale.slice(i, i + batchSize);

      await Promise.all(
        currentBatch.map((key) =>
          unkey.keys.updateKey({
            keyId: key.keyId,
            enabled,
            // Merge existing metadata with new plan metadata
            meta: { ...key.meta, ...planMetadata },
          }),
        ),
      );

      console.log(
        `Updated batch of ${currentBatch.length} keys for project ${projectId}`,
      );
    }

    cursor = apiKeys.pagination?.cursor;
    hasMore = apiKeys.pagination?.hasMore || false;
  }
}
