import type Stripe from "stripe";

import { logError } from "~/lib/.server/errors";

import { stripe } from "./client";

/**
 * Shared plumbing for the dashboard's Stripe webhooks. Each webhook is a
 * SEPARATE Stripe endpoint with ONE purpose and ONE outcome — so each has its
 * own URL (`/webhook/stripe/<context>`), its own subscribed events, and its own
 * signing secret. This module holds only what's identical across them:
 * verifying the signature. What an event MEANS stays in the route.
 *
 * Registered webhooks:
 * - `subscription-access` — revoke/restore API keys as billing changes.
 * - `customer-link` — bind a Stripe customer to its team.
 */

/** A verified event, or the Response to return verbatim. */
export type WebhookVerification =
  | { event: Stripe.Event; response?: never }
  | { event?: never; response: Response };

/**
 * Verify a webhook request against ONE endpoint's signing secret.
 *
 * The raw body is what Stripe signs, so it's read as text and never parsed
 * first. A missing secret is a 500 (misconfigured — Stripe retries and it shows
 * up in the logs) and a bad signature is a 400; neither leaks detail, since an
 * unverified caller could be anyone.
 */
export async function verifyStripeWebhook(
  request: Request,
  secretEnvVar: string,
  context: string,
): Promise<WebhookVerification> {
  const secret = process.env[secretEnvVar];
  if (!secret) {
    logError(
      new Error(`${secretEnvVar} is not set — cannot verify ${context} webhooks`),
      { webhook: context },
    );
    return { response: new Response("Webhook not configured", { status: 500 }) };
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return {
      response: new Response("Missing stripe-signature header", { status: 400 }),
    };
  }

  try {
    const payload = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
    return { event };
  } catch (error) {
    logError(error, { webhook: context });
    return { response: new Response("Invalid signature", { status: 400 }) };
  }
}

/** The Stripe customer an event is about, if it names one. */
export function customerIdOf(event: Stripe.Event): null | string {
  const object = event.data.object as { customer?: unknown };
  const customer = object.customer;
  if (typeof customer === "string") return customer;
  if (customer && typeof customer === "object" && "id" in customer) {
    const { id } = customer as { id: unknown };
    return typeof id === "string" ? id : null;
  }
  return null;
}
