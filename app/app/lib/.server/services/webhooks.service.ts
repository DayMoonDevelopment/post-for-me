import type { Webhook, WebhookEventType, WebhookSummary } from "~/lib/types/webhook";

/** Create a webhook. `eventTypes` is the subscription set; `url` must be unique
 * within the project (the API enforces this and returns a conflict). */
export interface CreateWebhookInput {
  eventTypes: WebhookEventType[];
  projectId: string;
  url: string;
}

/** Update a webhook's config. `eventTypes` replaces the subscription set; `url`
 * is optional (omit to leave unchanged). */
export interface UpdateWebhookInput {
  eventTypes: WebhookEventType[];
  url?: string;
}

/**
 * Manages a project's webhooks through the real Post For Me API (the API owns
 * the signing secret + uniqueness + delivery). Returns app-native
 * {@link Webhook} DTOs. Built per-request from a temporary-key-authenticated
 * client — NOT from the services bag — because it acts as the user against the
 * API (see `resolveProjectApiClient`).
 *
 * The delivery log (`webhook_events`) is NOT part of this port: the public API
 * exposes no events endpoint, so it's read from Supabase directly via
 * `listWebhookEvents`.
 */
export interface WebhooksService {
  /** Create a webhook; returns it incl. the API-generated `secretKey`. */
  create(input: CreateWebhookInput): Promise<Webhook>;
  /** Delete a webhook. */
  delete(id: string): Promise<void>;
  /** A single webhook incl. its signing secret. */
  get(id: string): Promise<Webhook>;
  /** The project's webhooks (no secret) — the temp key scopes them to the
   * project. */
  list(projectId: string): Promise<WebhookSummary[]>;
  /** Update a webhook's url and/or subscriptions. */
  update(id: string, input: UpdateWebhookInput): Promise<void>;
}
