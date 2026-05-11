import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";
import type Stripe from "stripe";
import { Database } from "./supabase.types";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_METER_EVENT_ID = process.env.STRIPE_METER_EVENT_ID;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

if (!STRIPE_METER_EVENT_ID) {
  throw new Error("Missing STRIPE_METER_EVENT_ID");
}

const stripe = require("stripe")(STRIPE_SECRET_KEY);

const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

type TeamRow = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "name" | "stripe_customer_id"
>;

type TeamUsageInsert =
  Database["public"]["Tables"]["social_post_team_usage"]["Insert"];

const PAGE_SIZE = 500;
const UPSERT_BATCH_SIZE = 500;

export type BackfillTeamUsagePayload = {
  team_ids?: string[];
  dry_run?: boolean;
};

const asIso = (unixSeconds: number): string =>
  new Date(unixSeconds * 1000).toISOString();

const getSubscriptionItemProduct = async (
  item: Stripe.SubscriptionItem,
): Promise<Stripe.Product> => {
  const product = item.price.product;

  const retrievedProduct = await stripe.products.retrieve(product);

  if ("deleted" in retrievedProduct && retrievedProduct.deleted) {
    throw new Error("Subscription product is deleted");
  }

  return retrievedProduct;
};

const getSubscriptionLimitDetails = async (
  subscription: Stripe.Subscription,
): Promise<{ limit: number; item: Stripe.SubscriptionItem }> => {
  for (const item of subscription.items.data) {
    const product = await getSubscriptionItemProduct(item);
    const limitValue = product.metadata.social_post_limit;
    const limit = Number(limitValue);

    if (limitValue && Number.isFinite(limit) && limit > 0) {
      return { limit, item };
    }
  }

  throw new Error("No subscription item has valid social_post_limit metadata");
};

const fetchTeamsWithStripeCustomers = async (): Promise<TeamRow[]> => {
  const teams: TeamRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("teams")
      .select("id,name,stripe_customer_id")
      .not("stripe_customer_id", "is", null)
      .neq("stripe_customer_id", "")
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    teams.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return teams;
};

const getMeteredUsage = async ({
  stripeCustomerId,
  startTime,
  endTime,
}: {
  stripeCustomerId: string;
  startTime: number;
  endTime: number;
}): Promise<number> => {
  let total = 0;
  let startingAfter: string | undefined;

  while (true) {
    const summaries = await stripe.billing.meters.listEventSummaries(
      STRIPE_METER_EVENT_ID,
      {
        customer: stripeCustomerId,
        start_time: startTime,
        end_time: endTime,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
    );

    total += summaries.data.reduce(
      (sum: number, summary: Stripe.Billing.MeterEventSummary) =>
        sum + (summary.aggregated_value || 0),
      0,
    );

    if (!summaries.has_more || summaries.data.length === 0) {
      break;
    }

    startingAfter = summaries.data[summaries.data.length - 1]?.id;
  }

  return Math.max(0, Math.round(total));
};

const upsertUsageWindows = async (
  usageRows: TeamUsageInsert[],
): Promise<void> => {
  const { error } = await supabase
    .from("social_post_team_usage")
    .upsert(usageRows, { onConflict: "team_id,start_at,end_at" });

  if (error) {
    throw error;
  }
};

export const backfillTeamUsage = task({
  id: "backfill-team-usage",
  maxDuration: 3600,
  machine: "medium-1x",
  retry: { maxAttempts: 1 },
  run: async (payload: BackfillTeamUsagePayload = {}) => {
    const isDryRun = Boolean(payload.dry_run);
    const requestedTeamIds =
      payload.team_ids?.filter((teamId) => teamId.trim().length > 0) ?? [];

    const teams = await fetchTeamsWithStripeCustomers();
    const teamsToProcess =
      requestedTeamIds.length > 0
        ? teams.filter((team) => requestedTeamIds.includes(team.id))
        : teams;

    logger.info("Starting team usage backfill", {
      total_teams_with_customer_ids: teams.length,
      teams_to_process: teamsToProcess.length,
      requested_team_ids: requestedTeamIds,
      dry_run: isDryRun,
    });

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const usageRowsToUpsert: TeamUsageInsert[] = [];

    for (const team of teamsToProcess) {
      const stripeCustomerId = team.stripe_customer_id;

      if (!stripeCustomerId) {
        skipCount += 1;
        continue;
      }

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "active",
          limit: 1,
        });

        const subscription: Stripe.Subscription | undefined =
          subscriptions.data[0];

        if (!subscription) {
          skipCount += 1;
          logger.info("Skipping team without active subscription", {
            team_id: team.id,
            team_name: team.name,
            stripe_customer_id: stripeCustomerId,
          });
          continue;
        }

        const { limit, item } = await getSubscriptionLimitDetails(subscription);

        const currentStart = item.current_period_start;
        const currentEnd = item.current_period_end;
        const periodLength = currentEnd - currentStart;

        if (periodLength <= 0) {
          throw new Error("Invalid subscription period bounds");
        }

        const previousStart = currentStart - periodLength;
        const previousEnd = currentStart;

        const previousCount = await getMeteredUsage({
          stripeCustomerId,
          startTime: previousStart,
          endTime: previousEnd,
        });

        const currentCount = await getMeteredUsage({
          stripeCustomerId,
          startTime: currentStart,
          endTime: Math.min(currentEnd, Math.floor(Date.now() / 1000)),
        });

        const usageRows: TeamUsageInsert[] = [
          {
            team_id: team.id,
            count: previousCount,
            limit,
            start_at: asIso(previousStart),
            end_at: asIso(previousEnd),
          },
          {
            team_id: team.id,
            count: currentCount,
            limit,
            start_at: asIso(currentStart),
            end_at: asIso(currentEnd),
          },
        ];

        usageRowsToUpsert.push(...usageRows);

        successCount += 1;
        logger.info("Backfilled team usage windows", {
          team_id: team.id,
          team_name: team.name,
          stripe_customer_id: stripeCustomerId,
          previous_count: previousCount,
          current_count: currentCount,
          limit,
          previous_start_at: asIso(previousStart),
          previous_end_at: asIso(previousEnd),
          current_start_at: asIso(currentStart),
          current_end_at: asIso(currentEnd),
          dry_run: isDryRun,
        });
      } catch (error) {
        errorCount += 1;
        logger.error("Failed to backfill team usage", {
          team_id: team.id,
          team_name: team.name,
          stripe_customer_id: stripeCustomerId,
          error,
        });
      }
    }

    if (!isDryRun && usageRowsToUpsert.length > 0) {
      for (
        let index = 0;
        index < usageRowsToUpsert.length;
        index += UPSERT_BATCH_SIZE
      ) {
        const batch = usageRowsToUpsert.slice(index, index + UPSERT_BATCH_SIZE);
        await upsertUsageWindows(batch);
      }
    }

    logger.info("Completed team usage backfill", {
      total_teams_with_customer_ids: teams.length,
      teams_processed: teamsToProcess.length,
      success_count: successCount,
      skipped_count: skipCount,
      error_count: errorCount,
      usage_rows_buffered: usageRowsToUpsert.length,
      dry_run: isDryRun,
    });

    return {
      total_teams_with_customer_ids: teams.length,
      teams_processed: teamsToProcess.length,
      success_count: successCount,
      skipped_count: skipCount,
      error_count: errorCount,
      dry_run: isDryRun,
    };
  },
});
