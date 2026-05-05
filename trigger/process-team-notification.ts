import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";

import { Database, Json } from "@post-for-me/db";

type TeamNotification =
  Database["public"]["Tables"]["team_notifications"]["Row"];

type LoopsMetadata = {
  transactional_id?: string;
  data?: Record<string, Json>;
};

type TeamNotificationMetadata = {
  data?: {
    loops?: LoopsMetadata;
  };
  results?: Array<{
    delivery_type: "email";
    email?: string;
    status: "sent" | "failed" | "skipped";
    deliveryCalled: boolean;
    statusCode?: number;
    error?: string;
  }>;
};

type EmailDeliveryResult = NonNullable<TeamNotificationMetadata["results"]>[number];

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
): Promise<EmailDeliveryResult> {
  if (!LOOPS_API_KEY) {
    logger.error("LOOPS_API_KEY is not configured", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    return {
      delivery_type: "email",
      status: "failed",
      deliveryCalled: false,
      error: "LOOPS_API_KEY is not configured",
    };
  }

  const metadata = (notification.meta_data as TeamNotificationMetadata) || {};
  const loopsMetadata = metadata.data?.loops;
  const transactionalEmailId = loopsMetadata?.transactional_id;

  if (!transactionalEmailId) {
    return {
      delivery_type: "email",
      status: "failed",
      deliveryCalled: false,
      error: "Loops transactional_id not set",
    };
  }

  try {
    const email = await getTeamContactEmail(notification.team_id);

    if (!email) {
      logger.error("No contact email found for team notification", {
        notificationId: notification.id,
        teamId: notification.team_id,
      });
      return {
        delivery_type: "email",
        status: "skipped",
        deliveryCalled: false,
        error: "No contact email found for team notification",
      };
    }

    const deliveryCalled = true;

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
          ...(loopsMetadata?.data || {}),
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
      return {
        delivery_type: "email",
        email,
        status: "failed",
        deliveryCalled,
        statusCode: response.status,
        error: responseBody || "Failed to send Loops transactional email",
      };
    }

    logger.info("Sent team notification email", {
      notificationId: notification.id,
      teamId: notification.team_id,
      email,
    });

    return {
      delivery_type: "email",
      email,
      status: "sent",
      deliveryCalled,
      statusCode: response.status,
    };
  } catch (error) {
    logger.error("Unable to process Loops transactional email", {
      notificationId: notification.id,
      teamId: notification.team_id,
      error,
    });

    return {
      delivery_type: "email",
      status: "failed",
      deliveryCalled: false,
      error: error instanceof Error ? error.message : "Unknown email delivery error",
    };
  }
}

export const processTeamNotification = task({
  id: "process-team-notification",
  maxDuration: 300,
  retry: { maxAttempts: 1 },
  run: async (payload: TeamNotification) => {
    const deliveryResults: EmailDeliveryResult[] = [];

    logger.info("Processing team notification", {
      teamId: payload.team_id,
      deliveryType: payload.delivery_types,
      notificationType: payload.notification_type,
    });

    try {
      for (const deliveryType in payload.delivery_types) {
        switch (deliveryType) {
          case "email": {
            const result = await sendEmailNotification(payload);
            deliveryResults.push(result);
            break;
          }
          default: {
            logger.warn("Unsupported team notification delivery type", {
              notificationId: payload.id,
              deliveryType: deliveryType,
            });
            break;
          }
        }
      }
    } catch (error) {
      logger.error("Unable to deliver notification", { error });
    } finally {
      const metadata = (payload.meta_data as TeamNotificationMetadata) || {};
      const results = Array.isArray(metadata.results) ? metadata.results : [];
      const payloadToInsert: TeamNotification = {
        ...payload,
        meta_data: {
          ...metadata,
          results: [...results, ...deliveryResults],
        } as Json,
      };

      logger.info("Saving notification");
      const { data: insertedNotification, error } = await supabaseClient
        .from("team_notifications")
        .insert(payloadToInsert)
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
