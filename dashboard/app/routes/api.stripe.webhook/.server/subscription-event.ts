import { handleSubscriptionHealthChange } from "~/lib/.server/handle-subscription-health-change.request";

import { trackSubscriptionLifecycle } from "./subscription-lifecycle-tracking";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";

export async function handleSubscriptionEvent(
  event:
    | Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent,
  supabaseServiceRole: SupabaseClient<Database>,
) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;

  // Toggle API key access based on subscription status. Payment-failure-shaped
  // statuses (past_due, unpaid, ...) get a grace period instead of an
  // immediate revoke; explicit cancellation (status "canceled" from a
  // customer.subscription.deleted event) still revokes right away.
  await handleSubscriptionHealthChange(
    {
      stripeCustomerId: customerId,
      latestStatus: subscription.status,
    },
    supabaseServiceRole,
  );

  // Lifecycle analytics. Best-effort: never let a tracking failure break the
  // Unkey side effect above or the webhook response.
  try {
    await trackSubscriptionLifecycle(event, supabaseServiceRole);
  } catch (error) {
    console.error("Failed to track subscription lifecycle in PostHog:", error);
  }
}
