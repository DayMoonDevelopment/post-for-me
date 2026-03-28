import { randomUUID } from "crypto";
import {
  addMonths,
  differenceInCalendarDays,
  subDays,
  subMonths,
} from "date-fns";
import { logger, schedules, tasks } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";

import { Database, Json } from "@post-for-me/db";

const LOOPS_SUBSCRIPTION_RENEWAL_TRANSACTIONAL_EMAIL_ID =
  process.env.LOOPS_SUBSCRIPTION_RENEWAL_TRANSACTIONAL_EMAIL_ID || "";

const SUBSCRIPTION_RENEWAL_REMINDER_MESSAGE =
  "Your subscription renews soon. Review your plan and billing details to avoid interruptions.";

const TEAM_NOTIFICATION_KEY = "subscription_renewal_reminder";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const hasRenewalReminderInCurrentCycle = async (
  teamId: string,
  reminderStart: Date,
  renewalDate: Date,
): Promise<boolean> => {
  const { data: notifications, error } = await supabaseClient
    .from("team_notifications")
    .select("created_at, meta_data")
    .eq("team_id", teamId)
    .eq("notification_type", "payment_reminder")
    .gte("created_at", reminderStart.toISOString())
    .lt("created_at", renewalDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logger.error("Failed to fetch existing renewal notifications", {
      teamId,
      error,
    });
    return false;
  }

  return (notifications || []).some((notification) => {
    const metadata = notification.meta_data as { notification_key?: string };
    return metadata?.notification_key === TEAM_NOTIFICATION_KEY;
  });
};

const triggerRenewalReminder = async (
  teamId: string,
  renewalDate: Date,
): Promise<void> => {
  const metadata: Json = {
    transactional_email_id: LOOPS_SUBSCRIPTION_RENEWAL_TRANSACTIONAL_EMAIL_ID,
    notification_key: TEAM_NOTIFICATION_KEY,
    renewal_date: renewalDate.toISOString(),
  };

  await tasks.trigger("process-team-notification", {
    id: `tn_${randomUUID()}`,
    team_id: teamId,
    project_id: null,
    notification_type: "payment_reminder",
    delivery_type: "email",
    message: SUBSCRIPTION_RENEWAL_REMINDER_MESSAGE,
    meta_data: metadata,
    created_at: new Date().toISOString(),
  });
};

export const processSubscriptionRenewalNotifications = schedules.task({
  id: "process-subscription-renewal-notifications",
  cron: { pattern: "0 9 * * *", environments: ["PRODUCTION"] },
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    logger.info("Starting subscription renewal reminder check");

    if (!LOOPS_SUBSCRIPTION_RENEWAL_TRANSACTIONAL_EMAIL_ID) {
      logger.error(
        "LOOPS_SUBSCRIPTION_RENEWAL_TRANSACTIONAL_EMAIL_ID is not configured",
      );
      return;
    }

    const oneMonthAgo = subMonths(new Date(), 1).toISOString();

    const { data: paymentReminderNotifications, error: paymentReminderError } =
      await supabaseClient
        .from("team_notifications")
        .select("team_id")
        .eq("notification_type", "payment_reminder")
        .lte("created_at", oneMonthAgo);

    if (paymentReminderError) {
      logger.error("Failed to fetch payment reminder notifications", {
        error: paymentReminderError,
      });
      throw new Error(paymentReminderError.message);
    }

    const teamIdsFromNotifications = Array.from(
      new Set(
        (paymentReminderNotifications || []).map(
          (notification) => notification.team_id,
        ),
      ),
    );

    let teamsQuery = supabaseClient
      .from("teams")
      .select("id, updated_at")
      .not("stripe_customer_id", "is", null);

    teamsQuery = teamIdsFromNotifications.length
      ? teamsQuery.or(
          `id.in.(${teamIdsFromNotifications.join(",")}),created_at.gte.${oneMonthAgo}`,
        )
      : teamsQuery.gte("created_at", oneMonthAgo);

    const { data: teams, error: teamsError } = await teamsQuery;

    if (teamsError) {
      logger.error("Failed to fetch teams for renewal reminders", {
        error: teamsError,
      });
      throw new Error(teamsError.message);
    }

    if (!teams || teams.length === 0) {
      logger.info("No subscribed teams found for renewal reminders");
      return;
    }

    const now = new Date();
    let remindersTriggered = 0;

    for (const team of teams) {
      if (!team.updated_at) {
        continue;
      }

      const renewalDate = addMonths(new Date(team.updated_at), 1);
      const reminderDate = subDays(renewalDate, 5);

      const daysUntilRenewal = differenceInCalendarDays(renewalDate, now);

      if (daysUntilRenewal !== 5) {
        continue;
      }

      const alreadySent = await hasRenewalReminderInCurrentCycle(
        team.id,
        reminderDate,
        renewalDate,
      );

      if (alreadySent) {
        continue;
      }

      await triggerRenewalReminder(team.id, renewalDate);
      remindersTriggered += 1;
    }

    logger.info("Completed subscription renewal reminder check", {
      teamCount: teams.length,
      remindersTriggered,
    });
  },
});
