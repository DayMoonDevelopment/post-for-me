import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { resolveSocialPostResultProject } from "~/lib/.server/api/resource-project";
import { createApiSocialPostResultsService } from "~/lib/.server/services/social-post-results.api";
import { supabaseContext } from "~/lib/.server/supabase";

import type { Route } from "./+types/route";

/**
 * `GET /social-post-results/:socialPostResultId` — the standalone result page.
 *
 * A top-level resource URL (no `/projects/:projectId` prefix), so we first map
 * the result → its owning project via a cheap, RLS-scoped lookup
 * ({@link resolveSocialPostResultProject}; null → 404). That project scopes the
 * temporary API key ({@link resolveProjectApiClient} guards membership + the
 * active-subscription gate). When the API is unavailable (no subscription /
 * misconfig) we render an in-page notice instead of erroring. The owning project
 * seeds the sidebar's active project on this prefix-less URL; the post id drives
 * the back link. The minted-key Set-Cookie is merged into the response.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const id = params.socialPostResultId;
  const supabase = context.get(supabaseContext);
  const projectId = await resolveSocialPostResultProject(supabase, id);
  if (!projectId) throw new Response("Not found", { status: 404 });

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;

  if (!api.apiClient) {
    return data(
      {
        unavailable: true,
        reason: api.reason ?? "error",
        projectId,
        teamId: api.teamId,
        result: null,
      },
      init,
    );
  }

  const service = createApiSocialPostResultsService(api.apiClient, projectId);
  const result = await service.get(id);

  return data(
    {
      result,
      projectId,
      teamId: api.teamId,
      unavailable: false,
      reason: undefined,
    },
    init,
  );
}
