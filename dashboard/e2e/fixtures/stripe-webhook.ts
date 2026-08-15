import Stripe from "stripe";

import { BASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "./env";

export const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });

const WEBHOOK_PATH = "/api/stripe/webhook";

/**
 * Delivers a Stripe event to the local webhook, signed with the local signing
 * secret.
 *
 * Deliberately not the Stripe CLI. `stripe listen` authenticates independently
 * of STRIPE_SECRET_KEY, so it can happily forward events from a different
 * account than the app is reading — which is exactly the misalignment that
 * blocked the first attempt at verifying this issue. Signing here means the
 * events can never come from an account the app isn't looking at.
 *
 * The payload only needs to carry the customer id: the handler treats the event
 * as a trigger and re-reads entitlement from live Stripe state, so a fabricated
 * body cannot make the assertion pass on its own.
 */
export async function deliverStripeEvent(
  type: string,
  object: Record<string, unknown>,
): Promise<Response> {
  const payload = JSON.stringify({
    id: `evt_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object },
  });

  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: STRIPE_WEBHOOK_SECRET,
  });

  return fetch(`${BASE_URL}${WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });
}

/**
 * Fires the event Stripe sends when a subscription changes, and asserts the
 * webhook accepted it. A non-2xx here means the handler threw — which is the
 * correct behavior on failure, but a test that ignored it would silently assert
 * against unchanged state.
 */
export async function deliverSubscriptionEvent(
  type:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted",
  subscription: Stripe.Subscription,
): Promise<void> {
  const response = await deliverStripeEvent(
    type,
    subscription as unknown as Record<string, unknown>,
  );

  if (!response.ok) {
    throw new Error(
      `Webhook rejected ${type}: ${response.status} ${await response.text()}`,
    );
  }
}
