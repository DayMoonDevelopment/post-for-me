import { createClient } from "@supabase/supabase-js";
import { logger, retry, task } from "@trigger.dev/sdk";
import { Database } from "@post-for-me/db";

type EventTypeEnum = Database["public"]["Enums"]["webhook_event_type"];
type EventStatusEnum = Database["public"]["Enums"]["webhook_event_status"];

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const processWebhooks = task({
  id: "process-webhook-event",
  machine: "medium-1x",
  maxDuration: 3600,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    id: string;
    url: string;
    secret: string;
    type: EventTypeEnum;
    data: any;
  }) => {
    const { id, url, type, data, secret } = payload;
    let status: EventStatusEnum = "processing";
    let details: {
      response?: { status?: number; statusText?: string; body?: string };
    } = {};
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
    } catch (error) {
      logger.error("Failed to process webhook", { error });
      status = "failed";
    } finally {
      const updateEvent = await supabaseClient
        .from("webhook_events")
        .update({ status, response: details })
        .eq("id", id);

      if (updateEvent.error) {
        logger.error("Failed to update webhook event", {
          error: updateEvent.error,
        });
      }
    }
  },
});
