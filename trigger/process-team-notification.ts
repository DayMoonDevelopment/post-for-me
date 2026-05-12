import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";

import { Database, Json } from "./supabase.types";

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

type EmailDeliveryResult = NonNullable<
  TeamNotificationMetadata["results"]
>[number];

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || "";
const LOOPS_TRANSACTIONAL_URL = "https://app.loops.so/api/v1/transactional";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const getTeamContactEmail = async (
  teamId: string,
): Promise<string | undefined> => {
  logger.info("Fetching team contact email", { teamId });

  const { data: team, error: teamError } = await supabaseClient
    .from("teams")
    .select("billing_email, user:users!created_by (email)")
    .eq("id", teamId)
    .single();

  if (!team || teamError) {
    logger.error("Unable to fetch team", { error: teamError });
    throw new Error("Unable to select team");
  }

  logger.info("Resolved team contact email", {
    teamId,
    hasBillingEmail: Boolean(team.billing_email),
    hasOwnerEmail: Boolean(team.user?.email),
  });

  return team.billing_email || team.user?.email;
};

async function sendEmailNotification(
  notification: TeamNotification,
): Promise<EmailDeliveryResult> {
  logger.info("Starting email notification delivery", {
    notificationId: notification.id,
    teamId: notification.team_id,
    notificationType: notification.notification_type,
  });

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

  logger.info("Parsed Loops metadata", {
    notificationId: notification.id,
    teamId: notification.team_id,
    hasLoopsMetadata: Boolean(loopsMetadata),
    hasTransactionalId: Boolean(transactionalEmailId),
    dataVariableKeys: Object.keys(loopsMetadata?.data || {}),
  });

  if (!transactionalEmailId) {
    logger.error("Loops transactional_id not set", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });
    return {
      delivery_type: "email",
      status: "failed",
      deliveryCalled: false,
      error: "Loops transactional_id not set",
    };
  }

  try {
    logger.info("Resolving email target for notification", {
      notificationId: notification.id,
      teamId: notification.team_id,
    });

    const email = await getTeamContactEmail(notification.team_id);

    logger.info("Resolved email target for notification", {
      notificationId: notification.id,
      teamId: notification.team_id,
      email,
    });

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

    logger.info("Sending Loops transactional email request", {
      notificationId: notification.id,
      teamId: notification.team_id,
      email,
      transactionalEmailId,
      messageLength: notification.message?.length || 0,
    });

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

    logger.info("Received Loops transactional email response", {
      notificationId: notification.id,
      teamId: notification.team_id,
      email,
      status: response.status,
      ok: response.ok,
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
      error:
        error instanceof Error ? error.message : "Unknown email delivery error",
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
      notificationId: payload.id,
      teamId: payload.team_id,
      deliveryType: payload.delivery_types,
      notificationType: payload.notification_type,
    });

    try {
      for (const deliveryType of payload.delivery_types) {
        logger.info("Processing delivery type", {
          notificationId: payload.id,
          teamId: payload.team_id,
          deliveryType,
        });

        switch (deliveryType) {
          case "email": {
            const result = await sendEmailNotification(payload);
            deliveryResults.push(result);

            logger.info("Completed delivery type", {
              notificationId: payload.id,
              teamId: payload.team_id,
              deliveryType,
              result,
            });
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
      logger.error("Unable to deliver notification", {
        notificationId: payload.id,
        teamId: payload.team_id,
        error,
      });
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

      logger.info("Saving notification", {
        notificationId: payload.id,
        teamId: payload.team_id,
        existingResultCount: results.length,
        newResultCount: deliveryResults.length,
        totalResultCount: results.length + deliveryResults.length,
      });

      const { data: insertedNotification, error } = await supabaseClient
        .from("team_notifications")
        .insert(payloadToInsert)
        .select()
        .single();

      if (error) {
        logger.error("Unable to save team notification", {
          notificationId: payload.id,
          teamId: payload.team_id,
          error,
        });
      } else {
        logger.info("Inserted notification", {
          id: insertedNotification.id,
          originalNotificationId: payload.id,
          teamId: payload.team_id,
        });
      }
    }
  },
});
