import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";
import { resolveSubscriptionEntitlement } from "~/lib/.server/resolve-subscription-entitlement.request";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/.server/database.types";

/**
 * Single decision path for both Stripe webhook entry points
 * (subscription-event.ts and invoice-event.ts) that previously each computed
 * their own boolean and called updateAPIKeyAccess directly. Centralizing here
 * lets us apply a configurable grace period to payment failures while still
 * revoking immediately on explicit cancellation, without the two webhook
 * paths racing each other or diverging in behavior.
 *
 * The triggering event is deliberately not passed in. Access is re-derived
 * from live Stripe state on every call, so a replayed or out-of-order delivery
 * converges on the same answer instead of applying whatever status the event
 * happened to be carrying.
 *
 * Throws on failure so the webhook can answer 5xx and let Stripe retry. A
 * swallowed error here leaves a churned team's keys enabled permanently, with
 * Stripe having been told the delivery succeeded.
 */
export async function handleSubscriptionHealthChange(
  { stripeCustomerId }: { stripeCustomerId: string },
  supabaseServiceRole: SupabaseClient<Database>,
) {
  const team = await supabaseServiceRole
    .from("teams")
    .select("id, payment_failed_at")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (team.error) {
    throw new Error(
      `Failed to look up team for customer ${stripeCustomerId}: ${team.error.message}`,
    );
  }

  if (!team.data) {
    // No team carries this customer id — usually because the customer-link
    // webhook hasn't landed yet, or the Stripe customer was created without
    // team_id metadata. Throwing puts it in Stripe's failed-delivery list to
    // be retried and surfaced, instead of silently leaving keys enabled.
    throw new Error(
      `No team linked to Stripe customer ${stripeCustomerId}; cannot sync API key access`,
    );
  }

  const { id: teamId, payment_failed_at: paymentFailedAt } = team.data;

  const entitlement = await resolveSubscriptionEntitlement(stripeCustomerId);

  const clearGracePeriod = async () => {
    if (!paymentFailedAt) return;

    const cleared = await supabaseServiceRole
      .from("teams")
      .update({ payment_failed_at: null })
      .eq("id", teamId);

    if (cleared.error) {
      throw new Error(
        `Failed to clear payment_failed_at for team ${teamId}: ${cleared.error.message}`,
      );
    }
  };

  if (entitlement.verdict === "entitled") {
    await clearGracePeriod();
    await updateAPIKeyAccess(
      { teamId, enabled: true, entitlement },
      supabaseServiceRole,
    );
    return;
  }

  if (entitlement.verdict === "immediate_revoke") {
    await clearGracePeriod();
    await updateAPIKeyAccess(
      { teamId, enabled: false, entitlement },
      supabaseServiceRole,
    );
    return;
  }

  // Payment-failure-shaped status (past_due, unpaid, incomplete, paused, ...).
  // Start the grace period clock only if it isn't already running — the
  // conditional WHERE keeps this safe against subscription-event.ts and
  // invoice-event.ts racing each other for the same failure. Access is left
  // untouched here; only trigger/reconcile-subscription-access.ts revokes it,
  // once the grace period has actually elapsed.
  if (!paymentFailedAt) {
    const marked = await supabaseServiceRole
      .from("teams")
      .update({ payment_failed_at: new Date().toISOString() })
      .eq("id", teamId)
      .is("payment_failed_at", null);

    if (marked.error) {
      throw new Error(
        `Failed to start grace period for team ${teamId}: ${marked.error.message}`,
      );
    }
  }
}
