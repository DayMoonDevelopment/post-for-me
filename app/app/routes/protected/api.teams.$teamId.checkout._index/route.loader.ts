import { requireTeamMember, requireUser } from "~/lib/.server/guards";
import { createBillingDestination } from "~/lib/.server/stripe/billing";

import type { Route } from "./+types/route";

/**
 * `GET /api/teams/:teamId/checkout` — returns the billing URL as **data**
 * (`{ url }`), for callers that want the link before navigating (e.g. prefetch,
 * or a custom loading flow). Same `createBillingDestination` as the redirect
 * adapter; only the delivery differs. For the normal click→wait→go, prefer the
 * `redirect.*` POST.
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const user = await requireUser(context);
  const team = await requireTeamMember(context, params.teamId);

  const url = new URL(request.url);
  const volumeRaw = url.searchParams.get("volume");

  return createBillingDestination({
    team,
    user,
    origin: url.origin,
    volume: volumeRaw ? Number(volumeRaw) : null,
  });
}
