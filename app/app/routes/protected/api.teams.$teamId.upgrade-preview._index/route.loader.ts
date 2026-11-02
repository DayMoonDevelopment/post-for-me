import { requireTeamMember } from "~/lib/.server/guards";
import { previewTierUpgrade } from "~/lib/.server/stripe/subscription-change";

import type { Route } from "./+types/route";

/**
 * `GET /api/teams/:teamId/upgrade-preview?price=…` — what a plan change costs.
 *
 * Priced with the SAME parameters the commit uses, so the confirmation screen
 * can't quote a number the invoice then contradicts. Read-only: nothing is
 * changed until the billing action is posted.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const team = await requireTeamMember(context, params.teamId);
  const priceId = new URL(request.url).searchParams.get("price");

  if (!priceId || !team.stripeCustomerId) return { preview: null };

  const preview = await previewTierUpgrade(team.stripeCustomerId, priceId);
  return { preview };
}
