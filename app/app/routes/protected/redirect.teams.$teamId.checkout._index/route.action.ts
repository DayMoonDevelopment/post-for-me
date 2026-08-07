import { redirect } from "react-router";

import {
  BILLING_PLANS_PARAM,
  BILLING_PLANS_VALUE,
} from "~/components/billing/billing-checkout-param";
import { redirectBackWithAppException } from "~/lib/.server/errors";
import { requireTeamMember, requireUser } from "~/lib/.server/guards";
import { localPathname } from "~/lib/.server/local-path";
import { createBillingDestination } from "~/lib/.server/stripe/billing";

import type { Route } from "./+types/route";

/**
 * Where Checkout's "← back" returns: the originating page's PATH plus the flag
 * that re-opens the plan picker. {@link localPathname} drops the page's own
 * query (e.g. `?setup=tour`) so exactly one picker re-opens, and rejects
 * anything that isn't genuinely local — which falls back to home.
 */
function billingCancelPath(returnTo: string | null): string {
  const path = localPathname(returnTo) ?? "/";
  return `${path}?${BILLING_PLANS_PARAM}=${BILLING_PLANS_VALUE}`;
}

/**
 * `POST /redirect/teams/:teamId/checkout` — the side-effecting billing redirect.
 * Invoked from a `<fetcher.Form>` so the button can show a spinner while Stripe
 * resolves the URL; then 302s off-origin to Stripe (RR turns that into a
 * `window.location.assign`). POST because it creates a Stripe session.
 *
 * A `redirect.*` route ALWAYS redirects — it never returns renderable data (a
 * no-JS POST would render it as raw JSON). On failure it 302s back to the
 * originating page with the error flashed, and the root toasts it globally.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
  let returnTo: string | null = null;
  try {
    const user = await requireUser(context);
    const team = await requireTeamMember(context, params.teamId);

    const form = await request.formData();
    const returnToValue = form.get("return_to");
    returnTo = typeof returnToValue === "string" ? returnToValue : null;
    const volumeRaw = form.get("volume");
    const volume =
      typeof volumeRaw === "string" && volumeRaw ? Number(volumeRaw) : null;
    const priceValue = form.get("price");
    const priceId = typeof priceValue === "string" ? priceValue : null;

    const { url } = await createBillingDestination({
      team,
      user,
      origin: new URL(request.url).origin,
      volume,
      priceId,
      cancelTo: billingCancelPath(returnTo),
      // The portal returns to the exact page they left, query string and all.
      returnTo,
    });
    return redirect(url); // success → off to Stripe
  } catch (error) {
    // A redirect.* route ALWAYS redirects (never renders): normalize + log +
    // flash the public message back to the originating page. Handles guard
    // Responses (4xx) and billing AppExceptions (5xx) alike.
    return redirectBackWithAppException(request, error, {
      returnTo,
      context: { teamId: params.teamId },
    });
  }
}
