import { redirect } from "react-router";

import { servicesContext } from "~/lib/.server/services";
import { stripe } from "~/lib/.server/stripe/client";

import type { Route } from "./+types/route";

/**
 * `GET /callback/teams/:teamId/checkout` — Stripe **Checkout**'s `success_url`
 * returns here (only new/converting customers produce one; existing customers go
 * to the portal and return to `/`, so they never hit this). GET because Stripe
 * controls the method.
 *
 * It links `teams.stripe_customer_id` from the completed session immediately —
 * the new customer id exists only on the session, so this is the realtime link
 * (`webhook/stripe/customer-link` is the backstop for every other path) — then
 * drops the user into the launchpad guided tour. Emits NO conversion events.
 *
 * Auth + team membership are enforced by the `callback.teams.$teamId` layout
 * middleware, so by the time this runs the caller is a member of `:teamId`.
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      if (session.status === "complete" && customerId) {
        await context
          .get(servicesContext)
          .teams.linkStripeCustomer(params.teamId, customerId);
      }
    } catch (error) {
      // Best-effort: the API webhook also links the customer during sync.
      console.error("checkout callback: failed to link Stripe customer", error);
    }
  }

  // `checkout=success` tells the guided tour to lead with a payment-confirmation
  // slide (see SETUP_TOUR_CONFIRM_PARAM); only this Stripe-return path sets it.
  throw redirect("/?setup=tour&checkout=success");
}
