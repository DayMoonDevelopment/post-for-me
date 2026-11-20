import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { listWebhookEvents } from "~/lib/.server/services/webhook-events.supabase";
import { createApiWebhooksService } from "~/lib/.server/services/webhooks.api";
import { supabaseContext } from "~/lib/.server/supabase";

import type { Route } from "./+types/route";

import { parseEventListParams } from "./schemas/events-list-params";

/**
 * `GET /projects/:projectId/webhooks/:webhookId` — the webhook's config (incl.
 * signing secret) read from the API via a temporary project key, plus its
 * delivery events read from Supabase (no API events endpoint). When the API is
 * unavailable (no subscription / misconfig) we render an in-page notice.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { projectId, webhookId } = params;
  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;

  if (!api.apiClient) {
    return data(
      {
        unavailable: true,
        reason: api.reason ?? "error",
        projectId,
        teamId: api.teamId,
        webhook: null,
        events: null,
      },
      init,
    );
  }

  const webhook = await createApiWebhooksService(api.apiClient).get(webhookId);
  const supabase = context.get(supabaseContext);
  const eventParams = parseEventListParams(new URL(request.url).searchParams);
  const events = await listWebhookEvents(supabase, webhookId, eventParams);

  return data(
    {
      unavailable: false,
      reason: undefined,
      projectId,
      teamId: api.teamId,
      webhook,
      events,
    },
    init,
  );
}
