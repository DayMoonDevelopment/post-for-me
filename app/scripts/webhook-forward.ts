/**
 * Local Stripe event forwarder — a stand-in for `stripe listen`.
 *
 *   bun run stripe:forward
 *
 * `stripe listen` forwards events from whichever account the CLI is logged into.
 * When that isn't the account `STRIPE_SECRET_KEY` points at, nothing the app
 * creates is ever delivered. This polls the events API with the SAME key the app
 * uses, so it is structurally incapable of that mismatch, and signs each payload
 * with the local webhook secret before POSTing it to the route.
 *
 * Faithful for handler testing — the payloads are real Stripe events. The one
 * thing it does not exercise is Stripe's own delivery/retry mechanics.
 *
 * Needs Caddy's CA on the trust path:
 *   NODE_EXTRA_CA_CERTS="$HOME/Library/Application Support/Caddy/pki/authorities/local/root.crt"
 * (the `stripe:forward` package script sets this for you).
 */
import crypto from "node:crypto";

import Stripe from "stripe";

const BASE = process.env.WEBHOOK_BASE_URL ?? "https://app.postforme.foo";
const POLL_MS = 2000;

/** Same split as the two Stripe endpoints: one purpose, one secret. */
const ROUTES = [
  {
    path: "/webhook/stripe/subscription-access",
    secretVar: "STRIPE_WEBHOOK_SECRET_SUBSCRIPTION_ACCESS",
    types: new Set([
      "customer.subscription.created",
      "customer.subscription.deleted",
      "customer.subscription.paused",
      "customer.subscription.resumed",
      "customer.subscription.updated",
      "invoice.paid",
      "invoice.payment_failed",
    ]),
  },
  {
    path: "/webhook/stripe/customer-link",
    secretVar: "STRIPE_WEBHOOK_SECRET_CUSTOMER_LINK",
    types: new Set(["customer.created", "customer.updated"]),
  },
];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });

function sign(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

async function deliver(event: Stripe.Event): Promise<void> {
  const route = ROUTES.find((candidate) => candidate.types.has(event.type));
  if (!route) return;

  const secret = process.env[route.secretVar];
  if (!secret) {
    console.log(`  ⚠️  ${route.secretVar} not set — skipping ${event.type}`);
    return;
  }

  const payload = JSON.stringify(event);
  console.log(`--> ${event.type} [${event.id}]`);
  try {
    const response = await fetch(`${BASE}${route.path}`, {
      method: "POST",
      headers: { "stripe-signature": sign(payload, secret) },
      body: payload,
    });
    console.log(`<-- [${response.status}] POST ${route.path} — ${(await response.text()).trim()}`);
  } catch (error) {
    console.log(`<-- FAILED ${route.path}: ${(error as Error).message}`);
  }
}

const seen = new Set<string>();
let since = Math.floor(Date.now() / 1000);

console.log(`forwarding ${BASE} — polling every ${POLL_MS}ms (^C to quit)`);

for (;;) {
  try {
    const events = await stripe.events.list({ created: { gte: since - 5 }, limit: 100 });
    // Oldest first, so a subscription's events arrive in the order they happened.
    for (const event of events.data.reverse()) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      await deliver(event);
      since = Math.max(since, event.created);
    }
  } catch (error) {
    console.log(`poll failed: ${(error as Error).message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
