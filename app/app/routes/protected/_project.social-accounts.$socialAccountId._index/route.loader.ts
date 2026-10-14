import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { resolveSocialAccountProject } from "~/lib/.server/api/resource-project";
import { createApiSocialAccountsService } from "~/lib/.server/services/social-accounts.api";
import { supabaseContext } from "~/lib/.server/supabase";

import type { Route } from "./+types/route";

/**
 * `GET /social-accounts/:socialAccountId` — the account detail page.
 *
 * The route lives at a top-level resource URL (no `/projects/:projectId`
 * prefix), so we first map the account → its owning project via a cheap,
 * RLS-scoped lookup ({@link resolveSocialAccountProject}; null → 404). That
 * project scopes the temporary API key ({@link resolveProjectApiClient} guards
 * membership + the active-subscription gate). When the API is unavailable (no
 * subscription / misconfig) we render an in-page notice instead of erroring.
 *
 * Token VALUES are deliberately NOT loaded here — only the NON-SECRET token meta
 * (expiry instants + a per-token presence boolean) via `getTokenMeta`, so the
 * page renders the expiry dates immediately. The values are fetched on an
 * explicit user action from `/api/social-accounts/:socialAccountId/tokens`. The
 * minted-key Set-Cookie is merged into the response.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const id = params.socialAccountId;
  const supabase = context.get(supabaseContext);
  const projectId = await resolveSocialAccountProject(supabase, id);
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
        account: null,
        tokenMeta: null,
        posts: null,
      },
      init,
    );
  }

  const service = createApiSocialAccountsService(api.apiClient, projectId);
  const [account, tokenMeta, posts] = await Promise.all([
    service.get(id),
    service.getTokenMeta(id),
    service.listPostsForAccount(id),
  ]);

  return data(
    {
      account,
      tokenMeta,
      posts,
      projectId,
      teamId: api.teamId,
      unavailable: false,
      reason: undefined,
    },
    init,
  );
}
