import { handleConnectionCallback } from "~/lib/.server/social-accounts/callback";

import type { Route } from "./+types/route";

/**
 * Quickstart OAuth callback: `/callback/$provider/account`. The project id isn't
 * in the URL — it's recovered from the `social_provider_connection_oauth_data`
 * row the API stashed under the OAuth `state` (`projectIdFromPath: null`). The
 * shared handler either redirects to the customer's `auth_callback_url`, or
 * returns the branded fallback data this route renders (legacy behavior).
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  return handleConnectionCallback({
    request,
    context,
    projectIdFromPath: null,
    provider: params.provider,
  });
}
