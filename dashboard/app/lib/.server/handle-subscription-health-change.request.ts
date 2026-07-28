import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database } from "~/lib/.server/database.types";

// Statuses where the team fully lost its subscription by choice (or it was
// never completed) — access is revoked immediately, no grace period. Every
// other non-active status (past_due, unpaid, incomplete, paused, ...) is
// treated as a payment-failure-shaped issue and gets the grace period.
const IMMEDIATE_REVOKE_STATUSES: Array<Stripe.Subscription.Status | null> = [
  null,
  "canceled",
  "incomplete_expired",
];

/**
 * Single decision path for both Stripe webhook entry points
 * (subscription-event.ts and invoice-event.ts) that previously each computed
 * their own boolean and called updateAPIKeyAccess directly. Centralizing here
 * lets us apply a configurable grace period to payment failures while still
 * revoking immediately on explicit cancellation, without the two webhook
 * paths racing each other or diverging in behavior.
 */
export async function handleSubscriptionHealthChange(
  {
    stripeCustomerId,
    latestStatus,
  }: {
    stripeCustomerId: string;
    latestStatus: Stripe.Subscription.Status | null;
  },
  supabaseServiceRole: SupabaseClient<Database>,
) {
  const isActive = latestStatus === "active" || latestStatus === "trialing";
  const isImmediateRevoke = IMMEDIATE_REVOKE_STATUSES.includes(latestStatus);

  const team = await supabaseServiceRole
    .from("teams")
    .select("id, payment_failed_at")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (team.error || !team.data) {
    console.error(
      `Failed to find team for customer ${stripeCustomerId}:`,
      team.error,
    );
    return;
  }

  if (isActive) {
    if (team.data.payment_failed_at) {
      await supabaseServiceRole
        .from("teams")
        .update({ payment_failed_at: null })
        .eq("id", team.data.id);
    }

    await updateAPIKeyAccess(
      { teamId: team.data.id, enabled: true },
      supabaseServiceRole,
    );
    return;
  }

  if (isImmediateRevoke) {
    if (team.data.payment_failed_at) {
      await supabaseServiceRole
        .from("teams")
        .update({ payment_failed_at: null })
        .eq("id", team.data.id);
    }

    await updateAPIKeyAccess(
      { teamId: team.data.id, enabled: false },
      supabaseServiceRole,
    );
    return;
  }

  // Payment-failure-shaped status (past_due, unpaid, incomplete, paused, ...).
  // Start the grace period clock only if it isn't already running — the
  // conditional WHERE keeps this safe against subscription-event.ts and
  // invoice-event.ts racing each other for the same failure. Access is left
  // untouched here; only trigger/process-payment-grace-period.ts revokes it,
  // once the grace period has actually elapsed.
  if (!team.data.payment_failed_at) {
    await supabaseServiceRole
      .from("teams")
      .update({ payment_failed_at: new Date().toISOString() })
      .eq("id", team.data.id)
      .is("payment_failed_at", null);
  }
}
