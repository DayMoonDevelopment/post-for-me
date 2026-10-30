import type Stripe from "stripe";

import { logError } from "~/lib/.server/errors";
import { customerIdOf, verifyStripeWebhook } from "~/lib/.server/stripe/webhook";
import { syncApiKeyAccessForCustomer } from "~/lib/.server/subscription-access";

import type { Route } from "./+types/route";

/** ONE outcome: a team's API keys match its billing state. Every event here can
 * change whether the team is paying, and they all run the same sync — access is
 * re-derived from live Stripe state, never from the payload — so the set can
 * grow without new branches. Anything else belongs on a different endpoint. */
const HANDLED_EVENTS = new Set<Stripe.Event["type"]>([
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.updated",
  "invoice.paid",
  "invoice.payment_failed",
]);

/**
 * `POST /webhook/stripe/subscription-access` — churn protection (PFM-936).
 *
 * On a billing change it toggles the team's Unkey keys, so a churned team loses
 * API access and a returning one gets it back (Unkey rejects a disabled key at
 * verify, so the API 401s without any change on its side).
 *
 * Purpose-scoped: its own Stripe endpoint, its own signing secret
 * (`STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS`), and only the events that bear
 * on access. It emits no analytics and writes nothing but key state.
 *
 * Ungated by session (public group); the signature IS the auth. Handler
 * failures are a 500 so Stripe retries — the sync is idempotent, so a replay is
 * free.
 *
 * Interim, by design: see `app/lib/.server/subscription-access/README.md`.
 */
export async function action({ request }: Route.ActionArgs) {
  const { event, response } = await verifyStripeWebhook(
    request,
    "STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS",
    "subscription-access",
  );
  if (response) return response;

  if (!HANDLED_EVENTS.has(event.type)) {
    return new Response("Ignored", { status: 200 });
  }

  const stripeCustomerId = customerIdOf(event);
  if (!stripeCustomerId) {
    // Nothing to key off — acknowledging avoids a retry loop that can't succeed.
    console.warn(
      `[webhook/stripe/subscription-access] ${event.type} (${event.id}) has no customer — skipped`,
    );
    return new Response("No customer on event", { status: 200 });
  }

  try {
    const result = await syncApiKeyAccessForCustomer(stripeCustomerId);
    console.log(
      `[webhook/stripe/subscription-access] ${event.type} → team ${result.teamId ?? "none"}: ` +
        `access ${result.enabled ? "enabled" : "disabled"}, ` +
        `${result.keysUpdated} key(s) updated across ${result.projects} project(s)`,
    );
    if (result.failedProjects > 0) {
      // Some keys are still on the wrong side of the gate — let Stripe retry.
      return new Response("Partial failure", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    logError(error, {
      webhook: "subscription-access",
      event: event.type,
      stripeCustomerId,
    });
    return new Response("Webhook handler failed", { status: 500 });
  }
}
