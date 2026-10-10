import { requireUnkey } from "~/lib/.server/api/unkey";
import { createSupabaseServiceRoleClient } from "~/lib/.server/supabase";

import { resolveSubscriptionEntitlement } from "./entitlement";

/** How many Unkey updates we fire at once (mirrors v1) — enough to drain a
 * team's keys quickly without opening a connection per key. */
const UPDATE_BATCH_SIZE = 10;

export interface SyncApiKeyAccessResult {
  /** The access state we converged the team's keys on. */
  enabled: boolean;
  /** Projects whose keys we couldn't fully update — the caller should fail the
   * request so the sender retries. */
  failedProjects: number;
  /** Keys actually changed (already-correct keys are skipped). */
  keysUpdated: number;
  projects: number;
  /** Null when no team maps to the customer (not ours — nothing to do). */
  teamId: null | string;
}

interface UnkeyKeyRow {
  enabled: boolean;
  keyId: string;
  meta?: null | Record<string, unknown>;
}

/** True when the key already matches the state we want, so the update is a
 * no-op. Renewals fire `customer.subscription.updated` on every cycle, and this
 * keeps those from rewriting every key each month. */
function isUpToDate(
  key: UnkeyKeyRow,
  enabled: boolean,
  planMeta: Record<string, string>,
): boolean {
  if (key.enabled !== enabled) return false;
  return Object.entries(planMeta).every(
    ([field, value]) => key.meta?.[field] === value,
  );
}

/** Toggle every key under one project (`externalId = projectId`), stamping the
 * current plan metadata. Returns how many keys actually changed. */
async function syncProjectKeys(
  projectId: string,
  enabled: boolean,
  planMeta: Record<string, string>,
): Promise<number> {
  const { unkey, apiId } = requireUnkey();
  const stale: UnkeyKeyRow[] = [];

  const iterator = await unkey.apis.listKeys({
    apiId,
    externalId: projectId,
    limit: 100,
    // A key minted moments ago must not slip through a churn sweep.
    revalidateKeysCache: true,
  });
  for await (const page of iterator) {
    for (const key of page.result.data) {
      if (!isUpToDate(key, enabled, planMeta)) stale.push(key);
    }
  }

  for (let index = 0; index < stale.length; index += UPDATE_BATCH_SIZE) {
    const batch = stale.slice(index, index + UPDATE_BATCH_SIZE);
    await Promise.all(
      batch.map((key) =>
        unkey.keys.updateKey({
          keyId: key.keyId,
          enabled,
          // `meta` REPLACES on update, so merge onto what's already there.
          meta: { ...key.meta, ...planMeta },
        }),
      ),
    );
  }

  return stale.length;
}

/**
 * Converge a team's API keys on its live subscription state: every key under
 * every project of the team is enabled while the team is subscribed and
 * disabled once it isn't (Unkey rejects a disabled key at verify, so the API
 * 401s without any change on its side).
 *
 * Keyed off the Stripe customer because that's what a billing event carries.
 * The team is resolved with the SERVICE-ROLE Supabase client — a webhook has no
 * session, and the read crosses team boundaries by design.
 *
 * Managed-credential ("system") projects follow the same switch but only stay
 * on when the plan actually includes the add-on, so re-enabling a team never
 * hands it an entitlement it isn't paying for. When the plan can't be
 * classified those projects are left untouched rather than guessed at.
 *
 * Per-project failures are counted, not thrown: one unreachable project must
 * not strand the rest of the team's keys. The count is the caller's cue to fail
 * the request and let the sender retry — the whole operation is idempotent.
 */
export async function syncApiKeyAccessForCustomer(
  stripeCustomerId: string,
): Promise<SyncApiKeyAccessResult> {
  const supabase = createSupabaseServiceRoleClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) {
    // A Stripe customer we don't have a team for (another product in the same
    // account, or a checkout whose team link isn't written yet). Nothing to do.
    return {
      teamId: null,
      enabled: false,
      projects: 0,
      keysUpdated: 0,
      failedProjects: 0,
    };
  }

  const entitlement = await resolveSubscriptionEntitlement(stripeCustomerId);

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, is_system")
    .eq("team_id", team.id);
  if (projectsError) throw projectsError;

  let keysUpdated = 0;
  let failedProjects = 0;
  let syncedProjects = 0;

  for (const project of projects ?? []) {
    // Unclassifiable plan + a system project → leave it exactly as it is.
    if (project.is_system && entitlement.systemCredentials === null) continue;

    const enabled = project.is_system
      ? entitlement.active && entitlement.systemCredentials === true
      : entitlement.active;

    try {
      keysUpdated += await syncProjectKeys(
        project.id,
        enabled,
        entitlement.planMeta,
      );
      syncedProjects += 1;
    } catch (error) {
      failedProjects += 1;
      console.error(
        `[subscription-access] failed to sync keys for project ${project.id} (team ${team.id})`,
        error,
      );
    }
  }

  return {
    teamId: team.id,
    enabled: entitlement.active,
    projects: syncedProjects,
    keysUpdated,
    failedProjects,
  };
}
