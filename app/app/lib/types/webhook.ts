/**
 * Domain types for project webhooks — app-native DTOs over the `webhooks`,
 * `webhook_subscribed_event_types`, and `webhook_events` tables. Routes/UI deal
 * only in these; the Supabase vocabulary stays inside the adapter.
 *
 * The `secret_key` here is the user's per-webhook **signing secret** — it is
 * meant to be revealed and copied (bank-style masked reveal), and is NOT the
 * app-credentials secret invariant (that's provider `appId`/`appSecret`, see the
 * `app-credentials-never-exposed` rule / PFM-684). It is kept off the list DTO
 * so it isn't fetched casually across every row — only `get`/`create` resolve it.
 */

/** The six delivery event types a webhook can subscribe to — the exact
 * `webhook_event_type` DB enum, so the cast at the boundary is safe. Shown
 * verbatim in the UI (e.g. `social.post.created`), Stripe-style. */
export const WEBHOOK_EVENT_TYPES = [
  "social.post.created",
  "social.post.updated",
  "social.post.deleted",
  "social.post.result.created",
  "social.account.created",
  "social.account.updated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export function isWebhookEventType(value: unknown): value is WebhookEventType {
  return (
    typeof value === "string" &&
    (WEBHOOK_EVENT_TYPES as readonly string[]).includes(value)
  );
}

/** Delivery lifecycle of a single `webhook_events` row — the `webhook_event_status`
 * DB enum. `completed` (success) · `failed` (error) · `pending`/`processing`
 * (in flight). */
export const WEBHOOK_EVENT_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export function isWebhookEventStatus(
  value: unknown,
): value is WebhookEventStatus {
  return (
    typeof value === "string" &&
    (WEBHOOK_EVENT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * A webhook as shown in the list — config only, **no signing secret**. A project
 * can own many; `url` is unique within a project. `eventTypes` is the deduped set
 * of subscriptions.
 */
export interface WebhookSummary {
  /** `created_at` (ISO-8601) — may be null on legacy rows. */
  createdAt: string | null;
  eventTypes: WebhookEventType[];
  id: string;
  url: string;
}

/**
 * A webhook with its resolved signing secret — returned by `get` (detail page
 * reveal) and `create` (shown once on creation, re-retrievable later). Never
 * returned by `list`.
 */
export interface Webhook extends WebhookSummary {
  secretKey: string;
}

/** One delivery attempt against a webhook. `data`/`response` are opaque JSON
 * payloads, folded in only where the detail view needs them. */
export interface WebhookEvent {
  createdAt: string | null;
  data?: unknown;
  id: string;
  response?: unknown;
  status: WebhookEventStatus;
  type: WebhookEventType;
}

export const WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE = 20;

/** Sort spec for the server-driven events table. */
export interface WebhookEventSort {
  direction: "asc" | "desc";
  field: "createdAt" | "status" | "type";
}

/** Server-side query for a webhook's events (there can be many). */
export interface WebhookEventListParams {
  page?: number;
  pageSize?: number;
  sort?: WebhookEventSort;
  status?: WebhookEventStatus[];
  type?: WebhookEventType[];
}

export interface WebhookEventListResult {
  events: WebhookEvent[];
  page: number;
  pageSize: number;
  total: number;
}
