import { logger, schedules } from "@trigger.dev/sdk";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase.types";
import { updateApiKeyAccess } from "./update-api-key-access";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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

type UnhealthyTeam = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "stripe_customer_id" | "payment_failed_at"
>;

const getUnhealthyTeams = async (): Promise<UnhealthyTeam[]> => {
  const { data, error } = await supabaseClient
    .from("teams")
    .select("id, stripe_customer_id, payment_failed_at")
    .not("payment_failed_at", "is", null);

  if (error) {
    throw error;
  }

  return data ?? [];
};

const getLatestSubscriptionStatus = async (
  stripeCustomerId: string,
): Promise<Stripe.Subscription.Status | null> => {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 1,
  });

  return subscriptions.data[0]?.status ?? null;
};

const clearGracePeriod = async (teamId: string): Promise<void> => {
  const { error } = await supabaseClient
    .from("teams")
    .update({ payment_failed_at: null })
    .eq("id", teamId);

  if (error) {
    logger.error("Failed to clear payment_failed_at", {
      team_id: teamId,
      error,
    });
  }
};

/**
 * Sweeps teams whose subscription left active/trialing (past_due, unpaid,
 * etc.) and, once PAYMENT_GRACE_PERIOD_DAYS has elapsed since
 * teams.payment_failed_at, revokes API access. Also self-heals teams whose
 * subscription actually recovered (or was canceled) but whose webhook never
 * arrived — see dashboard/app/lib/.server/handle-subscription-health-change.request.ts
 * for the webhook-side half of this mechanism, which sets/clears
 * payment_failed_at but never revokes access itself.
 */
export const processPaymentGracePeriod = schedules.task({
  cron: { pattern: "*/30 * * * *", environments: ["PRODUCTION"] },
  id: "process-payment-grace-period",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    const unhealthyTeams = await getUnhealthyTeams();

    if (unhealthyTeams.length === 0) {
      logger.info("No teams currently in a payment grace period");
      return;
    }

    for (const team of unhealthyTeams) {
      try {
        if (!team.stripe_customer_id) {
          logger.error("Unhealthy team missing stripe_customer_id", {
            team_id: team.id,
          });
          continue;
        }

        if (!team.payment_failed_at) {
          continue;
        }

        const latestStatus = await getLatestSubscriptionStatus(
          team.stripe_customer_id,
        );
        const isActive =
          latestStatus === "active" || latestStatus === "trialing";
        const isCanceled =
          latestStatus === null ||
          latestStatus === "canceled" ||
          latestStatus === "incomplete_expired";

        if (isActive) {
          // Webhook was missed or arrived late — self-heal.
          logger.info(
            "Team recovered before grace period ended, self-healing",
            { team_id: team.id },
          );
          await clearGracePeriod(team.id);
          await updateApiKeyAccess(
            { teamId: team.id, enabled: true },
            supabaseClient,
          );
          continue;
        }

        if (isCanceled) {
          logger.info("Team subscription canceled, revoking access", {
            team_id: team.id,
          });
          await clearGracePeriod(team.id);
          await updateApiKeyAccess(
            { teamId: team.id, enabled: false },
            supabaseClient,
          );
          continue;
        }

        const failedAt = new Date(team.payment_failed_at);
        const deadline = new Date(
          failedAt.getTime() + PAYMENT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
        );

        if (Date.now() < deadline.getTime()) {
          logger.info("Team still within payment grace period", {
            team_id: team.id,
            grace_period_ends_at: deadline.toISOString(),
          });
          continue;
        }

        logger.info("Grace period elapsed, revoking API access", {
          team_id: team.id,
          payment_failed_at: team.payment_failed_at,
        });
        // payment_failed_at is intentionally left set — it now doubles as an
        // "already past deadline / already revoked" marker so repeat ticks
        // are cheap no-ops instead of re-deriving state every 30 minutes.
        await updateApiKeyAccess(
          { teamId: team.id, enabled: false },
          supabaseClient,
        );
      } catch (teamError) {
        logger.error("Error processing team payment grace period", {
          team_id: team.id,
          error: teamError,
        });
      }
    }
  },
});
