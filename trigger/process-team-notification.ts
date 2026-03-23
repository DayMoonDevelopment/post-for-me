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

function isJsonObject(
  value: Json | null,
): value is Record<string, Json | undefined> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getNotificationMetadata(
  metaData: Json | null,
): Record<string, Json | undefined> {
  if (!isJsonObject(metaData)) {
    return {};
  }

  return metaData;
}

async function getTeamContactEmail(teamId: string): Promise<string | null> {
  const { data: team, error: teamError } = await supabaseClient
    .from("teams")
    .select("billing_email, created_by")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) {
    logger.error("Failed to fetch team details", {
      error: teamError,
      teamId,
    });
    return null;
  }

  if (!team) {
    logger.error("Team not found for notification", { teamId });
    return null;
  }

  if (team.billing_email && team.billing_email.trim() !== "") {
    return team.billing_email.trim();
  }

  if (!team.created_by) {
    logger.error("Team has no billing email or creator", { teamId });
    return null;
  }

  const { data: user, error: userError } = await supabaseClient
    .from("users")
    .select("email")
    .eq("id", team.created_by)
    .maybeSingle();

  if (userError) {
    logger.error("Failed to fetch team creator email", {
      error: userError,
      teamId,
      userId: team.created_by,
    });
    return null;
  }

  if (!user?.email || user.email.trim() === "") {
    logger.error("Team creator has no email", {
      teamId,
      userId: team.created_by,
    });
    return null;
  }

  return user.email.trim();
}

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
  retry: { maxAttempts: 2 },
  run: async (payload: TeamNotification) => {
    logger.info("Processing team notification", {
      notificationId: payload.id,
      teamId: payload.team_id,
      deliveryType: payload.delivery_type,
      notificationType: payload.notification_type,
    });

    switch (payload.delivery_type) {
      case "email": {
        await sendEmailNotification(payload);
        return;
      }
      default: {
        logger.warn("Unsupported team notification delivery type", {
          notificationId: payload.id,
          deliveryType: payload.delivery_type,
        });
        return;
      }
    }
  },
});
