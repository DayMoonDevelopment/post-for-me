import { withSupabase } from "~/lib/.server/supabase";
import { stripe } from "~/lib/.server/stripe";
import { STRIPE_WEBHOOK_SECRET } from "~/lib/.server/stripe.constants";

import { handleCustomerEvent } from "./.server/customer-event";
import { handleSubscriptionEvent } from "./.server/subscription-event";
import { handleInvoiceEvent } from "./.server/invoice-event";

export const action = withSupabase(async ({ request, supabaseServiceRole }) => {
  const sig = request.headers.get("stripe-signature");

  let event;

  if (!sig) {
    return new Response("Invalid signature", {
      status: 400,
    });
  }

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle the event.
  //
  // A handler that throws must answer 5xx so Stripe redelivers. These handlers
  // are what revoke a churned team's API access, and they are idempotent
  // (access is re-derived from live Stripe state on each attempt), so a retry
  // is always safe. Answering 200 on failure — as this did previously — told
  // Stripe the delivery succeeded and left the team's keys enabled for good.
  try {
    switch (event.type) {
      case "customer.created":
      case "customer.updated":
        await handleCustomerEvent(event.data.object, supabaseServiceRole);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event, supabaseServiceRole);
        break;
      case "invoice.created":
        await handleInvoiceEvent(event.data.object, supabaseServiceRole);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err: unknown) {
    // Narrowed rather than cast: a non-Error throw would otherwise render as
    // "Webhook handler error: undefined" in both the log and the 500 body,
    // hiding what actually failed.
    const message = err instanceof Error ? err.message : String(err);

    console.error(
      `Stripe webhook handler failed for ${event.type} (${event.id}):`,
      err,
    );
    return new Response(`Webhook handler error: ${message}`, {
      status: 500,
    });
  }

  return new Response("OK");
});
