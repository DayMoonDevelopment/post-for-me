import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";

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
  const isSubscriptionActive =
    subscription.status === "active" || subscription.status === "trialing";

  // Toggle API key access based on subscription status.
  await updateAPIKeyAccess(
    {
      stripeCustomerId: customerId,
      enabled: isSubscriptionActive,
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
