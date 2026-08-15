import { logger, schedules } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";

import { Database } from "./supabase.types";
import { updateApiKeyAccess } from "./update-api-key-access";
import { resolveSubscriptionEntitlement } from "./resolve-subscription-entitlement";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Kept in sync with dashboard/app/lib/.server/stripe.constants.ts's
// PAYMENT_GRACE_PERIOD_DAYS — siblings can't share code in this repo, so this
// value is duplicated. Update both if you change the grace period default.
const PAYMENT_GRACE_PERIOD_DAYS = parseInt(
  process.env?.PAYMENT_GRACE_PERIOD_DAYS || "2",
  10,
);

const TEAM_PAGE_SIZE = 500;

// Teams are reconciled a few at a time: each one costs at least one Stripe
// read, and this sweep now visits every billable team rather than only the
// handful in a grace period.
const CONCURRENCY = 5;

// Stop with room to spare inside maxDuration. A run killed at the hard limit
// dies mid-batch and logs nothing, so there is no signal that the sweep has
// outgrown its window; stopping ourselves lets us report what we didn't reach.
const RUN_BUDGET_MS = 50 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

type Team = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "stripe_customer_id" | "payment_failed_at"
>;

/**
 * Every team with a Stripe customer, least-recently-reconciled first.
 *
 * That ordering is the resume cursor. Teams are stamped as the sweep finishes
 * with them, so the ones a time-limited run never reached still carry an older
 * (or NULL) timestamp and sort to the front next hour. Ordering by `id`
 * instead — as this did — restarted from the first team every hour, which
 * meant an over-long run starved the same tail permanently.
 *
 * Safe to order by a column the sweep mutates: the whole list is materialized
 * before any team is reconciled, and `concurrencyLimit: 1` keeps a second
 * sweep from writing underneath this one.
 */
const getBillableTeams = async (): Promise<Team[]> => {
  const teams: Team[] = [];

  for (let from = 0; ; from += TEAM_PAGE_SIZE) {
    const { data, error } = await supabaseClient
      .from("teams")
      .select("id, stripe_customer_id, payment_failed_at")
      .not("stripe_customer_id", "is", null)
      .order("subscription_reconciled_at", {
        ascending: true,
        nullsFirst: true,
      })
      .order("id", { ascending: true })
      .range(from, from + TEAM_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    teams.push(...data);

    if (data.length < TEAM_PAGE_SIZE) break;
  }

  return teams;
};

/**
 * Advances the resume cursor for the teams this run actually finished.
 *
 * Only successful reconciles are stamped, so a team that threw sorts to the
 * front again next hour and gets retried. Failing to stamp costs nothing worse
 * than reconciling those teams again, so it never aborts the sweep.
 */
const markReconciled = async (teamIds: string[]): Promise<void> => {
  if (teamIds.length === 0) return;

  const { error } = await supabaseClient
    .from("teams")
    .update({ subscription_reconciled_at: new Date().toISOString() })
    .in("id", teamIds);

  if (error) {
    logger.error("Failed to advance subscription reconcile cursor", {
      team_ids: teamIds,
      error,
    });
  }
};

const clearGracePeriod = async (teamId: string): Promise<void> => {
  const { error } = await supabaseClient
    .from("teams")
    .update({ payment_failed_at: null })
    .eq("id", teamId);

  if (error) {
    throw new Error(
      `Failed to clear payment_failed_at for team ${teamId}: ${error.message}`,
    );
  }
};

/**
 * Starts the grace-period clock, but only if it isn't already running.
 *
 * The NULL guard is load-bearing: `payment_failed_at` is read once when the
 * sweep lists teams, and the sweep can run for up to an hour. Without it, a
 * team whose payment failed *during* the sweep would have the clock the webhook
 * just set overwritten with a fresh `now`, handing a non-paying team up to an
 * extra full grace period.
 */
const startGracePeriod = async (teamId: string): Promise<void> => {
  const { error } = await supabaseClient
    .from("teams")
    .update({ payment_failed_at: new Date().toISOString() })
    .eq("id", teamId)
    .is("payment_failed_at", null);

  if (error) {
    throw new Error(
      `Failed to start grace period for team ${teamId}: ${error.message}`,
    );
  }
};

type Outcome = "enabled" | "revoked" | "grace_started" | "in_grace";

/**
 * Reconciles one team's Unkey key state and plan metadata against live Stripe.
 *
 * Not free: every team costs one Stripe `subscriptions.list` plus one
 * cache-bypassing Unkey `listKeys` per project, on every tick, whether or not
 * anything changed. What the skip-if-already-correct filter avoids is the
 * `updateKey` writes, so a steady-state sweep is read-heavy but write-free.
 * If team count makes that too expensive, narrow what this visits rather than
 * loosening the filter.
 */
const reconcileTeam = async (team: Team): Promise<Outcome> => {
  const entitlement = await resolveSubscriptionEntitlement(
    team.stripe_customer_id,
  );

  if (entitlement.verdict === "entitled") {
    if (team.payment_failed_at) {
      // Recovered before the deadline, and the webhook that should have told us
      // never landed.
      await clearGracePeriod(team.id);
    }
    await updateApiKeyAccess(
      { teamId: team.id, enabled: true, entitlement },
      supabaseClient,
    );
    return "enabled";
  }

  if (entitlement.verdict === "immediate_revoke") {
    if (team.payment_failed_at) {
      await clearGracePeriod(team.id);
    }
    await updateApiKeyAccess(
      { teamId: team.id, enabled: false, entitlement },
      supabaseClient,
    );
    return "revoked";
  }

  // Payment-failure-shaped (past_due, unpaid, paused, ...).
  const clockStartedNow = !team.payment_failed_at;

  if (clockStartedNow) {
    // The webhook that should have started the clock was missed — start it now
    // rather than revoking, so the team still gets its full grace period.
    await startGracePeriod(team.id);
  }

  const failedAt = clockStartedNow
    ? Date.now()
    : new Date(team.payment_failed_at as string).getTime();

  if (Date.now() < failedAt + PAYMENT_GRACE_PERIOD_DAYS * DAY_MS) {
    // Inside the window the team keeps the access it had, so this branch still
    // syncs rather than returning early. Returning early meant a team whose
    // keys were wrongly disabled — a transient Unkey failure during an earlier
    // revoke, a stale webhook, a manual change — stayed broken until the
    // deadline passed, silently costing it the entire grace period this
    // mechanism exists to give. Write-free when the keys are already correct.
    await updateApiKeyAccess(
      { teamId: team.id, enabled: true, entitlement },
      supabaseClient,
    );
    return clockStartedNow ? "grace_started" : "in_grace";
  }

  // payment_failed_at is intentionally left set — it doubles as an "already
  // past deadline" marker, and updateApiKeyAccess no-ops once the keys are
  // already disabled.
  await updateApiKeyAccess(
    { teamId: team.id, enabled: false, entitlement },
    supabaseClient,
  );
  return "revoked";
};

/**
 * Converges every team's API key state on its live Stripe subscription state.
 *
 * This is the backstop for the Stripe webhook in
 * dashboard/app/routes/api.stripe.webhook. The webhook is the fast path, but
 * anything it misses — a dropped delivery, an endpoint outage, a team whose
 * stripe_customer_id wasn't linked when the event arrived — used to persist
 * forever, leaving a churned team's keys enabled. Nothing else re-checks.
 *
 * Also owns grace-period expiry: teams whose payment failed keep access until
 * PAYMENT_GRACE_PERIOD_DAYS has elapsed, then lose it here.
 *
 * Resumable rather than all-or-nothing. Teams are visited
 * least-recently-reconciled first and stamped as they complete, so a run that
 * hits its time budget hands the rest to the next hour instead of dropping
 * them.
 */
export const reconcileSubscriptionAccess = schedules.task({
  cron: { pattern: "0 * * * *", environments: ["PRODUCTION"] },
  id: "reconcile-subscription-access",
  // The sweep now visits every billable team, so a slow run could otherwise
  // still be going when the next hour fires and compound the API load.
  queue: { concurrencyLimit: 1 },
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    const startedAt = Date.now();
    const teams = await getBillableTeams();

    if (teams.length === 0) {
      logger.info("No teams with a Stripe customer to reconcile");
      return;
    }

    const counts: Record<Outcome, number> = {
      enabled: 0,
      revoked: 0,
      grace_started: 0,
      in_grace: 0,
    };
    let failed = 0;
    let attempted = 0;

    for (let i = 0; i < teams.length; i += CONCURRENCY) {
      if (Date.now() - startedAt > RUN_BUDGET_MS) break;

      const batch = teams.slice(i, i + CONCURRENCY);
      const reconciled: string[] = [];

      await Promise.all(
        batch.map(async (team) => {
          try {
            const outcome = await reconcileTeam(team);
            counts[outcome] += 1;
            reconciled.push(team.id);
          } catch (error) {
            // One bad team must not stop the sweep; it gets retried next tick.
            failed += 1;
            logger.error("Failed to reconcile team subscription access", {
              team_id: team.id,
              stripe_customer_id: team.stripe_customer_id,
              error,
            });
          }
        }),
      );

      attempted += batch.length;
      await markReconciled(reconciled);
    }

    const skipped = teams.length - attempted;

    logger.info("Subscription access reconciliation complete", {
      teams: teams.length,
      attempted,
      skipped,
      ...counts,
      failed,
      duration_ms: Date.now() - startedAt,
    });

    if (skipped > 0) {
      // Worth alerting on rather than just counting: the sweep no longer fits
      // in its hour, so every team is being reconciled less often than the
      // schedule claims. Skipped teams sort first next run, so nothing is
      // starved — but the window keeps shrinking until this is addressed.
      logger.error("Subscription access reconciliation ran out of time", {
        teams: teams.length,
        skipped,
        budget_ms: RUN_BUDGET_MS,
      });
    }
  },
});
