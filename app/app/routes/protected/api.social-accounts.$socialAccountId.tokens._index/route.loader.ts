import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { resolveSocialAccountProject } from "~/lib/.server/api/resource-project";
import { createApiSocialAccountsService } from "~/lib/.server/services/social-accounts.api";
import { supabaseContext } from "~/lib/.server/supabase";

import type { Route } from "./+types/route";

/**
 * `GET /api/social-accounts/:socialAccountId/tokens` — the account's token
 * VALUES, returned as data for the detail page's reveal/copy affordances, read
 * from the real API via a temporary project key.
 *
 * Security: the token strings are NEVER in any page loader / document — they
 * only ever travel through THIS dedicated, auth-guarded endpoint, hit by an
 * explicit `fetch` on user action. The account is mapped to its owning project
 * ({@link resolveSocialAccountProject}; null → 404) to scope the temporary key;
 * a `402` signals the API is unavailable (no subscription). We return a RAW JSON
 * `Response` (not a plain object) so a bare `fetch().then((r) => r.json())` gets
 * clean JSON rather than React Router's turbo-stream encoding, and stamp
 * `Cache-Control: no-store` so the secret is never persisted. The minted-key
 * Set-Cookie is merged in so a freshly-minted key is cached.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const id = params.socialAccountId;
  const supabase = context.get(supabaseContext);
  const projectId = await resolveSocialAccountProject(supabase, id);
  if (!projectId) throw new Response("Not found", { status: 404 });

  const api = await resolveProjectApiClient(context, request, projectId);
  if (!api.apiClient) return new Response(null, { status: 402 });

  const tokens = await createApiSocialAccountsService(
    api.apiClient,
    projectId,
  ).getTokens(id);

  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  const setCookie = api.headers?.get("Set-Cookie");
  if (setCookie) headers.append("Set-Cookie", setCookie);

  return new Response(
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
    { headers },
  );
}
