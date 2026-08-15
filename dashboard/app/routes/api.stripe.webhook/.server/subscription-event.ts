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

  // Lifecycle analytics runs first, and best-effort. It has to come before the
  // access sync, not after: the sync can throw (that's what makes Stripe retry
  // a failed revocation), and anything after it would be skipped. That would
  // drop the `customer_converted` event for brand-new subscribers — exactly the
  // case resolveTeam in subscription-lifecycle-tracking.ts exists to handle.
  try {
    await trackSubscriptionLifecycle(event, supabaseServiceRole);
  } catch (error) {
    console.error("Failed to track subscription lifecycle in PostHog:", error);
  }

  // Toggle API key access. Payment-failure-shaped statuses (past_due, unpaid,
  // ...) get a grace period instead of an immediate revoke; explicit
  // cancellation still revokes right away.
  //
  // Deliberately does not forward `subscription.status`. This event is only a
  // trigger — the status on it is a snapshot from when Stripe queued the
  // delivery, and Stripe guarantees neither ordering nor exactly-once. Passing
  // it through meant a late `updated` (status "active") arriving after a
  // `deleted` re-enabled a churned team's keys, and that cancelling one of two
  // subscriptions revoked access for a customer still paying on the other.
  //
  // The team_id hint is forwarded so a first-time subscriber resolves before
  // the post-checkout redirect has linked teams.stripe_customer_id.
  await handleSubscriptionHealthChange(
    {
      stripeCustomerId: customerId,
      teamIdHint: subscription.metadata?.team_id,
    },
    supabaseServiceRole,
  );
}
