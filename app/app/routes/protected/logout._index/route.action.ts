import { expiredTemporaryKeyCookies } from "~/lib/.server/api/temporary-key";
import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

/**
 * `POST /logout` — sign out.
 *
 * POST-only, deliberately: with a GET version any origin can force a sign-out
 * via `<img src="/logout">`, and link prefetchers or security scanners trip it
 * just by looking at the page. The only trigger is the account menu's
 * `<Form method="post">`.
 *
 * Ending the session also expires the cached temporary API keys, which outlive
 * it otherwise — see {@link expiredTemporaryKeyCookies}. The auth service
 * returns the redirect carrying Supabase's own sign-out cookies, so we append
 * to that response rather than building a new one.
 */
export async function action({ context, request }: Route.ActionArgs) {
  const response = await context.get(servicesContext).auth.logout();

  for (const cookie of expiredTemporaryKeyCookies(request)) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}
