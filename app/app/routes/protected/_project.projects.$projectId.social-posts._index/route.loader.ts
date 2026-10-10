import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { createApiSocialPostsService } from "~/lib/.server/services/social-posts.api";

import type { Route } from "./+types/route";

import { parseListParams } from "./schemas/list-params";

/**
 * `GET /projects/:projectId/social-posts` — a server-driven page of the project's
 * posts, read from the real API via a temporary project key
 * ({@link resolveProjectApiClient} guards membership + the active-subscription
 * gate and mints/reuses the key). The grid's filters and pagination live in the
 * URL; this loader parses them and asks the service for exactly the page to
 * render. When the API is unavailable (no subscription / misconfig) we render an
 * in-page notice instead of erroring. The minted-key Set-Cookie is merged in.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const projectId = params.projectId;
  const listParams = parseListParams(new URL(request.url).searchParams);

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;

  if (!api.apiClient) {
    return data(
      {
        result: { posts: [], total: 0, page: 1, pageSize: 25 },
        params: listParams,
        projectId,
        unavailable: true,
        reason: api.reason ?? "error",
        teamId: api.teamId,
      },
      init,
    );
  }

  const service = createApiSocialPostsService(api.apiClient, projectId);
  const result = await service.list(projectId, listParams);

  return data(
    {
      result,
      params: listParams,
      projectId,
      unavailable: false,
      reason: undefined,
      teamId: api.teamId,
    },
    init,
  );
}
