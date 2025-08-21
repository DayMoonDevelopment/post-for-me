import { createClient } from "@supabase/supabase-js";
import { logger, task, tasks } from "@trigger.dev/sdk";
import { Database } from "@post-for-me/db";

type EventTypeEnum = Database["public"]["Enums"]["webhook_event_type"];

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const processWebhooks = task({
  id: "process-webhooks",
  machine: "medium-1x",
  maxDuration: 3600,
  retry: { maxAttempts: 3 },
  run: async (payload: {
    projectId: string;
    eventType: string;
    eventData: any;
  }) => {
    const { projectId, eventType, eventData } = payload;

    const parsedEventType = eventType as EventTypeEnum;

    if (!projectId || !parsedEventType) {
      logger.error("Invalid Request", { projectId, parsedEventType });
      throw new Error("Invalid Request");
    }

    logger.info("Processing Webhooks", { projectId, eventType });

    const webhooks = await supabaseClient
      .from("webhooks")
      .select("*, webhook_subscribed_event_types!inner(type)", {
        head: false,
        count: "exact",
      })
      .eq("project_id", projectId)
      .in("webhook_subscribed_event_types.type", [eventType as EventTypeEnum]);

    if (webhooks.error) {
      logger.error("Unable to fetch webhooks", { error: webhooks.error });
      throw webhooks.error;
    }

    if (!webhooks.data) {
      logger.info("No webhooks found");
      return;
    }

    logger.info("Found webhooks to process", { count: webhooks.count });

    const events: {
      webhook_id: string;
      type: EventTypeEnum;
      data: any;
      status: "processing";
    }[] = webhooks.data.map((w) => ({
      webhook_id: w.id,
      type: parsedEventType,
      data: eventData,
      status: "processing",
    }));

    logger.info("Adding webhook events", { events });
    const webhookEvents = await supabaseClient
      .from("webhook_events")
      .insert(events)
      .select("*, webhooks(url, secret_key)");

    if (webhookEvents.error || !webhookEvents.data) {
      logger.error("Unable to add events for webhook", {
        error: webhookEvents.error,
        data: webhookEvents.data,
      });
      throw new Error("Unable to add events");
    }

    const batch = tasks.batchTrigger(
      "process-webhook-event",
      webhookEvents.data.map((we) => ({
        payload: {
          id: we.id,
          url: we.webhooks.url,
          type: we.type,
          data: we.data,
          secret: we.webhooks.secret_key,
        },
      }))
    );

    logger.info("Triggered event processing", { batch });

    return;
  },
});
