import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { createApiWebhooksService } from "~/lib/.server/services/webhooks.api";

import type { Route } from "./+types/route";

/**
 * `GET /projects/:projectId/webhooks` — the project's webhooks, read from the
 * real API via a temporary project key ({@link resolveProjectApiClient} guards
 * membership + the active-subscription gate and mints/reuses the key). When the
 * API is unavailable (no subscription / misconfig) we render an in-page notice
 * instead of erroring. The minted-key Set-Cookie is merged into the response.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const projectId = params.projectId;
  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;

  if (!api.apiClient) {
    return data(
      {
        webhooks: [],
        projectId,
        unavailable: true,
        reason: api.reason ?? "error",
        teamId: api.teamId,
      },
      init,
    );
  }

  const webhooks = await createApiWebhooksService(api.apiClient).list(projectId);
  return data(
    {
      webhooks,
      projectId,
      unavailable: false,
      reason: undefined,
      teamId: api.teamId,
    },
    init,
  );
}
