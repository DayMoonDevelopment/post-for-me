import type Stripe from "stripe";

import { linkCustomerToTeam } from "~/lib/.server/customer-team-link";
import { logError } from "~/lib/.server/errors";
import { verifyStripeWebhook } from "~/lib/.server/stripe/webhook";

import type { Route } from "./+types/route";

/** ONE outcome: `teams.stripe_customer_id` is set. Only the events that carry a
 * customer object with our `team_id` metadata belong here. */
const HANDLED_EVENTS = new Set<Stripe.Event["type"]>([
  "customer.created",
  "customer.updated",
]);

/**
 * `POST /webhook/stripe/customer-link` — bind a Stripe customer to its team.
 *
 * The link is the join key the rest of billing reads (portal, churn sweep,
 * temp-key gate). The checkout callback sets it on the happy path; this covers
 * every other way a customer comes into existence, which nothing did before.
 *
 * Purpose-scoped: its own Stripe endpoint, its own signing secret
 * (`STRIPE_WEBHOOK_SECRET_CUSTOMER_LINK`), two events, one write — and
 * deliberately NO key toggling. Access is the subscription-access webhook's
 * outcome; keeping them apart means a change to one can't move the other.
 *
 * Ungated by session (public group); the signature IS the auth.
 */
export async function action({ request }: Route.ActionArgs) {
  const { event, response } = await verifyStripeWebhook(
    request,
    "STRIPE_WEBHOOK_SECRET_CUSTOMER_LINK",
    "customer-link",
  );
  if (response) return response;

  if (!HANDLED_EVENTS.has(event.type)) {
    return new Response("Ignored", { status: 200 });
  }

  const customer = event.data.object as Stripe.Customer;
  const teamId = customer.metadata?.team_id;

  try {
    const result = await linkCustomerToTeam(customer.id, teamId);
    // Only the write is worth a line; the rest is the steady state (Stripe
    // re-sends `customer.updated` for unrelated edits).
    if (result.outcome === "linked") {
      console.log(
        `[webhook/stripe/customer-link] linked customer ${customer.id} → team ${result.teamId}`,
      );
    } else if (result.outcome === "team-not-found") {
      console.warn(
        `[webhook/stripe/customer-link] ${event.type}: no team ${teamId} for customer ${customer.id}`,
      );
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    logError(error, {
      webhook: "customer-link",
      event: event.type,
      stripeCustomerId: customer.id,
      teamId,
    });
    return new Response("Webhook handler failed", { status: 500 });
  }
}
