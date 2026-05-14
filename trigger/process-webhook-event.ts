import { createClient } from "@supabase/supabase-js";
import { logger, retry, tags, task } from "@trigger.dev/sdk";
import { Database } from "./supabase.types";

type EventTypeEnum = Database["public"]["Enums"]["webhook_event_type"];
type EventStatusEnum = Database["public"]["Enums"]["webhook_event_status"];

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const processWebhooks = task({
  id: "process-webhook-event",
  machine: "medium-1x",
  maxDuration: 3600,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    id: string;
    webhookId: string;
    url: string;
    secret: string;
    type: EventTypeEnum;
    data: any;
  }) => {
    const { id, webhookId, url, type, data, secret } = payload;
    let status: EventStatusEnum = "processing";
    const details: {
      response?: { status?: number; statusText?: string; body?: string };
      error?: string;
    } = {};

    await tags.add([`${webhookId}`, `${id}`]);

    try {
      const backoffResponse = await retry.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Post-For-Me-Webhook-Secret": secret,
        },
        body: JSON.stringify({ event_type: type, data }),
        timeoutInMs: 1_000,
        retry: {
          byStatus: {
            "300-599": {
              strategy: "backoff",
              maxAttempts: 8,
              factor: 2,
              minTimeoutInMs: 500,
              maxTimeoutInMs: 1_000,
              randomize: false,
            },
          },
          timeout: {
            maxAttempts: 8,
            factor: 2,
            minTimeoutInMs: 500,
            maxTimeoutInMs: 1_000,
            randomize: false,
          },
        },
      });

      details.response = {
        status: backoffResponse.status,
        statusText: backoffResponse.statusText,
      };

      status = backoffResponse.ok ? "completed" : "failed";

      try {
        details.response.body = await backoffResponse.text();
      } catch (error) {
        logger.info("Error reading webhook response", { error });
      }

      if (!backoffResponse.ok) {
        logger.error("Webhook delivery failed", {
          webhookId,
          webhookEventId: id,
          status: details.response.status,
          statusText: details.response.statusText,
          responseBody: details.response.body,
        });
      }
    } catch (error) {
      status = "failed";
      details.error =
        error instanceof Error
          ? error.message
          : "Unknown webhook delivery error";
      logger.error("Failed to process webhook", {
        webhookId,
        webhookEventId: id,
        error,
      });
    } finally {
      if (status === "processing") {
        status = "failed";

        if (!details.error) {
          details.error = "Webhook event exited without terminal status";
        }
      }

      const updateEvent = await supabaseClient
        .from("webhook_events")
        .update({
          status,
          response: details,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateEvent.error) {
        logger.error("Failed to update webhook event", {
          webhookId,
          webhookEventId: id,
          status,
          details,
          error: updateEvent.error,
        });
      }
    }
  },
});
