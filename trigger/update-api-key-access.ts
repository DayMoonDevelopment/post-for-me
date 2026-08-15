import { Unkey } from "@unkey/api";

import { resolveSubscriptionEntitlement } from "./resolve-subscription-entitlement";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";
import type { SubscriptionEntitlement } from "./resolve-subscription-entitlement";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });
const UNKEY_API_ID = process.env.UNKEY_API_ID!;

/**
 * Trigger-local copy of dashboard/app/lib/.server/update-api-key-access.request.ts's
 * Unkey key-toggle logic, used by reconcile-subscription-access.ts. Vendored
 * rather than imported per this repo's dumb-monorepo rule (no cross-sibling
 * imports) — keep both in sync if Unkey enable/disable behavior changes.
 *
 * Throws on failure rather than logging and continuing, so the caller can count
 * the team as unreconciled and retry it on the next tick instead of recording a
 * success that never happened.
 */
export async function updateApiKeyAccess(
  {
    teamId,
    enabled,
    entitlement,
  }: {
    teamId: string;
    enabled: boolean;
    /** Pre-resolved entitlement, to avoid a second Stripe round trip. */
    entitlement?: SubscriptionEntitlement;
  },
  supabaseClient: SupabaseClient<Database>,
): Promise<void> {
  const team = await supabaseClient
    .from("teams")
    .select("id, stripe_customer_id")
    .eq("id", teamId)
    .maybeSingle();

  if (team.error) {
    throw new Error(
      `Failed to look up team ${teamId}: ${team.error.message}`,
    );
  }

  if (!team.data) {
    throw new Error(`No team found for ${teamId}; cannot sync API key access`);
  }

  const resolved =
    entitlement ??
    (await resolveSubscriptionEntitlement(team.data.stripe_customer_id));

  const projects = await supabaseClient
    .from("projects")
    .select("id, is_system")
    .eq("team_id", teamId);

  if (projects.error) {
    throw new Error(
      `Failed to find projects for team ${teamId}: ${projects.error.message}`,
    );
  }

  if (!projects.data || projects.data.length === 0) {
    return;
  }

  const failures: string[] = [];

  for (const project of projects.data) {
    // Managed-credential projects additionally require the plan to grant system
    // credentials, so restoring access never over-grants.
    const projectEnabled = project.is_system
      ? enabled && resolved.grantsSystemCredentials
      : enabled;

    try {
      await syncProjectKeys(project.id, projectEnabled);
    } catch (error) {
      failures.push(
        `${project.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to sync API key access for team ${teamId} (${failures.length} of ${projects.data.length} projects): ${failures.join("; ")}`,
    );
  }
}

async function syncProjectKeys(projectId: string, enabled: boolean) {
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const apiKeys = await unkey.apis.listKeys({
      apiId: UNKEY_API_ID,
      externalId: projectId,
      limit: 100,
      cursor,
      revalidateKeysCache: true,
    });

    if (!apiKeys.data || apiKeys.data.length === 0) break;

    // Skip keys already in the desired state — this sweep runs over every team,
    // so without it a routine tick would rewrite every key in the system.
    const stale = apiKeys.data.filter((key) => key.enabled !== enabled);

    const batchSize = 10;
    for (let i = 0; i < stale.length; i += batchSize) {
      const batch = stale.slice(i, i + batchSize);
      await Promise.all(
        batch.map((key) =>
          unkey.keys.updateKey({ keyId: key.keyId, enabled }),
        ),
      );
    }

    cursor = apiKeys.pagination?.cursor;
    hasMore = apiKeys.pagination?.hasMore || false;
  }
}
