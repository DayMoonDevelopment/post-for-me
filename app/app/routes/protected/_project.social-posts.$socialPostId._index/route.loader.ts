import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { resolveSocialPostProject } from "~/lib/.server/api/resource-project";
import { createApiSocialPostsService } from "~/lib/.server/services/social-posts.api";
import { supabaseContext } from "~/lib/.server/supabase";

import type { Route } from "./+types/route";

/**
 * `GET /social-posts/:socialPostId` — the post detail page.
 *
 * A top-level resource URL (no `/projects/:projectId` prefix), so we first map
 * the post → its owning project via a cheap, RLS-scoped lookup
 * ({@link resolveSocialPostProject}; null → 404). That project scopes the
 * temporary API key ({@link resolveProjectApiClient} guards membership + the
 * active-subscription gate). When the API is unavailable (no subscription /
 * misconfig) we render an in-page notice instead of erroring. The owning project
 * seeds the sidebar's active project on this prefix-less URL + the back link. The
 * minted-key Set-Cookie is merged into the response.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const id = params.socialPostId;
  const supabase = context.get(supabaseContext);
  const projectId = await resolveSocialPostProject(supabase, id);
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
        post: null,
      },
      init,
    );
  }

  const service = createApiSocialPostsService(api.apiClient, projectId);
  const post = await service.get(id);

  return data(
    {
      post,
      projectId,
      teamId: api.teamId,
      unavailable: false,
      reason: undefined,
    },
    init,
  );
}
