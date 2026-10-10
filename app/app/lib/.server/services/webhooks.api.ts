import type { ApiClient } from "~/lib/.server/api/client";
import type { Webhook, WebhookSummary } from "~/lib/types/webhook";

import { AppException, ConflictException } from "~/lib/.server/errors";
import { isWebhookEventType } from "~/lib/types/webhook";

import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhooksService,
} from "./webhooks.service";

/** The API's webhook shape (`GET/POST/PATCH /v1/webhooks`). Note it carries no
 * timestamps, so our `createdAt` is null for API-sourced webhooks. */
interface ApiWebhook {
  event_types: string[];
  id: string;
  secret: string;
  url: string;
}

function toSummary(webhook: ApiWebhook): WebhookSummary {
  return {
    id: webhook.id,
    url: webhook.url,
    createdAt: null,
    eventTypes: webhook.event_types.filter(isWebhookEventType),
  };
}

function toWebhook(webhook: ApiWebhook): Webhook {
  return { ...toSummary(webhook), secretKey: webhook.secret };
}

/** The API enforces `UNIQUE(project_id, url)` at the DB and surfaces it as a
 * conflict; re-message it for the webhook form's inline error. */
function mapConflict(error: unknown): unknown {
  if (AppException.isAppException(error) && error.kind === "conflict") {
    return new ConflictException(
      "A webhook with this URL already exists in this project.",
      { cause: error },
    );
  }
  return error;
}

/**
 * API-backed {@link WebhooksService} — the ONLY code that knows the `/v1/webhooks`
 * wire shape. The API owns secret generation, url+project uniqueness, and
 * delivery. `projectId` in the inputs is implicit here (the temp key scopes the
 * request to its project), so it's accepted for the port but unused.
 */
export function createApiWebhooksService(client: ApiClient): WebhooksService {
  return {
    async list(): Promise<WebhookSummary[]> {
      const response = await client.get<{ data: ApiWebhook[] }>("/v1/webhooks");
      return response.data.map(toSummary);
    },

    async get(id): Promise<Webhook> {
      return toWebhook(await client.get<ApiWebhook>(`/v1/webhooks/${id}`));
    },

    async create({ url, eventTypes }: CreateWebhookInput): Promise<Webhook> {
      try {
        return toWebhook(
          await client.post<ApiWebhook>("/v1/webhooks", {
            url,
            event_types: eventTypes,
          }),
        );
      } catch (error) {
        throw mapConflict(error);
      }
    },

    async update(id, { url, eventTypes }: UpdateWebhookInput): Promise<void> {
      try {
        await client.patch(`/v1/webhooks/${id}`, {
          url,
          event_types: eventTypes,
        });
      } catch (error) {
        throw mapConflict(error);
      }
    },

    async delete(id): Promise<void> {
      await client.delete(`/v1/webhooks/${id}`);
    },
  };
}
