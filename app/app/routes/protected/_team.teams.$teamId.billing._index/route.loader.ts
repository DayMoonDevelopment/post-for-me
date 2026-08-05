import { requireTeamMember } from "~/lib/.server/guards";
import { getBillingSummary } from "~/lib/.server/stripe/billing-summary";

import type { Route } from "./+types/route";

/**
 * `GET /teams/:teamId/billing` — the team's billing + usage display.
 *
 * Membership is the gate (`requireTeamMember` → 403), and it hands back the
 * team DTO so we don't re-fetch it. Everything Stripe-shaped is resolved in one
 * `.server` read that degrades section-by-section, so a meter or invoice-preview
 * hiccup blanks that panel rather than the page.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const team = await requireTeamMember(context, params.teamId);
  const billing = await getBillingSummary(team);

  return { team: { id: team.id, name: team.name }, billing };
}
