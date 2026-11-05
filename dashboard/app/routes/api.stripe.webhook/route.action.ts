import { tasks } from "@trigger.dev/sdk";
import { stripe } from "~/lib/.server/stripe";
import { STRIPE_WEBHOOK_SECRET } from "~/lib/.server/stripe.constants";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
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

  let customerId: string | undefined;
  switch (event.type) {
    case "customer.created":
    case "customer.updated":
      customerId = event.data.object.id;
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.created":
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const customer = event.data.object.customer;
      customerId = typeof customer === "string" ? customer : customer?.id;
      break;
    }
    default:
      return new Response("OK");
  }

  try {
    await tasks.trigger("process-stripe-webhook", { event }, {
      concurrencyKey: customerId,
      idempotencyKey: `stripe-webhook:${event.id}`,
      idempotencyKeyTTL: "7d",
    });
  } catch (error) {
    console.error(`Failed to enqueue Stripe webhook ${event.id}:`, error);
    return new Response("Failed to enqueue webhook", { status: 503 });
  }

  return new Response("OK");
}
