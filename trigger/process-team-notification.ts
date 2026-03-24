import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";

import { Database, Json } from "@post-for-me/db";

type TeamNotification =
  Database["public"]["Tables"]["team_notifications"]["Row"];

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || "";
const LOOPS_TRANSACTIONAL_URL = "https://app.loops.so/api/v1/transactional";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const getTeamContactEmail = async (
  teamId: string,
): Promise<string | undefined> => {
  const { data: team, error: teamError } = await supabaseClient
    .from("teams")
    .select("billing_email, user:users!created_by (email)")
    .eq("id", teamId)
    .single();

  if (!team || teamError) {
    logger.error("Unable to fetch team", { error: teamError });
    throw new Error("Unable to select team");
  }

  return team.billing_email || team.user?.email;
};

async function sendEmailNotification(
  notification: TeamNotification,
): Promise<void> {
  if (!LOOPS_API_KEY) {
    logger.error("LOOPS_API_KEY is not configured", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    throw new Error("Unable to intialize loops client");
  }

  const metadata = notification.meta_data as {
    transactional_email_id?: string;
  };

  if (!metadata.transactional_email_id) {
    throw new Error("Loops email Id not set");
  }

  const transactionalEmailId = metadata.transactional_email_id;

  const email = await getTeamContactEmail(notification.team_id);

  if (!email) {
    logger.error("No contact email found for team notification", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    return;
  }

  const response = await fetch(LOOPS_TRANSACTIONAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOOPS_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      transactionalId: transactionalEmailId,
      dataVariables: {
        message: notification.message,
        ...((notification.meta_data as {}) || {}),
      },
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    logger.error("Failed to send Loops transactional email", {
      notificationId: notification.id,
      teamId: notification.team_id,
      email,
      status: response.status,
      responseBody,
    });
    return;
  }

  logger.info("Sent team notification email", {
    notificationId: notification.id,
    teamId: notification.team_id,
    email,
  });
}

export const processTeamNotification = task({
  id: "process-team-notification",
  maxDuration: 300,
  retry: { maxAttempts: 1 },
  run: async (payload: TeamNotification) => {
    logger.info("Processing team notification", {
      teamId: payload.team_id,
      deliveryType: payload.delivery_type,
      notificationType: payload.notification_type,
    });

    try {
      switch (payload.delivery_type) {
        case "email": {
          await sendEmailNotification(payload);
          break;
        }
        default: {
          logger.warn("Unsupported team notification delivery type", {
            notificationId: payload.id,
            deliveryType: payload.delivery_type,
          });
          break;
        }
      }
    } catch (error) {
      logger.error("Unable to deliver notification", { error });
    } finally {
      logger.info("Saving notification");
      const { data: insertedNotification, error } = await supabaseClient
        .from("team_notifications")
        .insert(payload)
        .select()
        .single();

      if (error) {
        logger.error("Unable to save team notification", { error });
        return;
      }

      logger.info("Inserted notification", { id: insertedNotification.id });
    }
  },
});
