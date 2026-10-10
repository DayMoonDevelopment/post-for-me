import { handleConnectionCallback } from "~/lib/.server/social-accounts/callback";

import type { Route } from "./+types/route";

/**
 * White Label OAuth callback: `/callback/$projectId/$provider/account`. The
 * project id is in the URL, so we trust the path. The shared handler either
 * redirects to the customer's own `auth_callback_url`, or returns the branded
 * fallback data this route renders (legacy behavior, unchanged).
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  return handleConnectionCallback({
    request,
    context,
    projectIdFromPath: params.projectId,
    provider: params.provider,
  });
}
