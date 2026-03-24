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

async function sendEmailNotification(
  notification: TeamNotification,
): Promise<void> {
  const metaData = getNotificationMetadata(notification.meta_data);
  const transactionalEmailId = metaData.transactional_email_id;

  if (
    typeof transactionalEmailId !== "string" ||
    transactionalEmailId.trim() === ""
  ) {
    logger.error("Notification metadata missing transactional_email_id", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    return;
  }

  if (!LOOPS_API_KEY) {
    logger.error("LOOPS_API_KEY is not configured", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    return;
  }

  const email = await getTeamContactEmail(notification.team_id);

  if (!email) {
    logger.error("No contact email found for team notification", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    return;
  }

  const { transactional_email_id: _, ...metadataWithoutTransactionalId } =
    metaData;

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
        metadata: metadataWithoutTransactionalId,
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
