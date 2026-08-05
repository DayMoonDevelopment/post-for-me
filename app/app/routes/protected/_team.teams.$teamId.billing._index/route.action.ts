import { toActionError } from "~/lib/.server/errors";
import { requireTeamMember } from "~/lib/.server/guards";
import { upgradeToTier } from "~/lib/.server/stripe/subscription-change";
import { actionError } from "~/lib/action-result";

import type { Route } from "./+types/route";

/**
 * `POST /teams/:teamId/billing` — change the team's plan in-app.
 *
 * Subscription changes are ours; Stripe's portal keeps only the
 * payment-instrument flows. The change is applied immediately (see
 * `subscription-change.ts` for the payoff + anchor-reset model) and the page
 * revalidates onto the new plan — no redirect off-site, no return trip.
 *
 * Failures come back as data so the page can toast them: a declined card is the
 * expected unhappy path here, and bouncing the user to an error boundary in the
 * middle of a plan change would lose the context they need to fix it.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const team = await requireTeamMember(context, params.teamId);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const priceId = formData.get("price");

  if (intent !== "upgrade") {
    return actionError("Unsupported billing action.");
  }
  if (typeof priceId !== "string" || priceId.length === 0) {
    return actionError("Choose a plan to continue.");
  }
  if (!team.stripeCustomerId) {
    return actionError("This team doesn't have billing set up yet.");
  }

  try {
    const result = await upgradeToTier(team.stripeCustomerId, priceId);
    return { ok: true as const, ...result };
  } catch (error) {
    // `upgradeToTier` throws AppExceptions with a safe public message; this
    // logs once and hands back the message for the toast.
    return toActionError(error, { teamId: team.id, priceId });
  }
}
