import { createClient } from "@supabase/supabase-js";
import { task } from "@trigger.dev/sdk";
import type Stripe from "stripe";
import type { Database } from "./supabase.types";
import { reconcileAPIKeys } from "./stripe-webhook/reconcile-api-keys";
import { trackSubscriptionLifecycle } from "./stripe-webhook/subscription-lifecycle-tracking";
import { syncTeamUsageLimitOnUpgrade } from "./stripe-webhook/sync-usage-limit";
import { stripe } from "./stripe-webhook/billing";

const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "customer.created":
    case "customer.updated": {
      // A delayed customer event must not overwrite current customer metadata.
      const customer = await stripe.customers.retrieve(event.data.object.id);
      if (customer.deleted || !customer.metadata.team_id) return;
      const { error } = await supabase.from("teams")
        .update({ stripe_customer_id: customer.id })
        .eq("id", customer.metadata.team_id)
        .is("stripe_customer_id", null);
      if (error) throw error;
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.created":
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const customer = event.data.object.customer;
      const customerId = typeof customer === "string" ? customer : customer?.id;
      if (!customerId) return;
      const subscriptions = await reconcileAPIKeys(customerId, supabase);
      // Complete retryable operational work before best-effort analytics to
      // avoid re-emitting lifecycle events on a partial key/usage failure.
      if (event.type === "customer.subscription.updated") {
        const current = subscriptions.find((sub) => sub.id === event.data.object.id);
        if (current) await syncTeamUsageLimitOnUpgrade(current, supabase);
      }
      if (event.type === "customer.subscription.created" ||
          event.type === "customer.subscription.updated" ||
          event.type === "customer.subscription.deleted") {
        try {
          await trackSubscriptionLifecycle(event, supabase);
        } catch (error) {
          console.error("Failed to track subscription lifecycle in PostHog:", error);
        }
      }
      return;
    }
  }
}

export const processStripeWebhook = task({
  id: "process-stripe-webhook",
  // The producer supplies the Stripe customer ID as concurrencyKey.
  queue: { concurrencyLimit: 1 },
  maxDuration: 3600,
  retry: { maxAttempts: 5, minTimeoutInMs: 1000, maxTimeoutInMs: 60000, factor: 2, randomize: true },
  run: async ({ event }: { event: Stripe.Event }) => handleStripeWebhook(event),
});
