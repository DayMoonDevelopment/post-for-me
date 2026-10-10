import type { TypedSupabaseClient } from "~/lib/.server/supabase";
import type { Database } from "~/lib/.server/supabase.types";
import type {
  WebhookEvent,
  WebhookEventListParams,
  WebhookEventListResult,
  WebhookEventType,
} from "~/lib/types/webhook";

import { fromSupabase } from "~/lib/.server/errors";
import { WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE } from "~/lib/types/webhook";

type DbWebhookEventType = Database["public"]["Enums"]["webhook_event_type"];

// Map the app's events sort field to its column; default ordering is newest-first.
const EVENT_SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  status: "status",
  type: "type",
};

/**
 * A server-driven page of a webhook's delivery events, read straight from
 * Supabase (`webhook_events`). This stays on Supabase because the public API
 * exposes NO webhook-events endpoint — events are produced asynchronously by the
 * API's Trigger.dev jobs. RLS scopes the read to the user's projects (via
 * `user_has_webhook_access`). Webhook CRUD, by contrast, goes through the API
 * (see `webhooks.api.ts`).
 */
export async function listWebhookEvents(
  supabase: TypedSupabaseClient,
  webhookId: string,
  params: WebhookEventListParams = {},
): Promise<WebhookEventListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("webhook_events")
    .select("id, type, status, created_at", { count: "exact" })
    .eq("webhook_id", webhookId);

  if (params.type?.length) {
    query = query.in("type", params.type as DbWebhookEventType[]);
  }
  if (params.status?.length) {
    query = query.in(
      "status",
      params.status as Database["public"]["Enums"]["webhook_event_status"][],
    );
  }

  const sort = params.sort;
  if (sort) {
    query = query.order(EVENT_SORT_COLUMNS[sort.field] ?? "created_at", {
      ascending: sort.direction === "asc",
    });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw fromSupabase(error);

  const events: WebhookEvent[] = data.map((row) => ({
    id: row.id,
    type: row.type as WebhookEventType,
    status: row.status,
    createdAt: row.created_at,
  }));
  return { events, total: count ?? 0, page, pageSize };
}
