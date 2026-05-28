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

  // Handle the event

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

  return new Response("OK");
});
