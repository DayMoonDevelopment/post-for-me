import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";
import { resolveSubscriptionEntitlement } from "~/lib/.server/resolve-subscription-entitlement.request";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/.server/database.types";

type TeamRow = { id: string; payment_failed_at: string | null };

/**
 * Finds the team a Stripe customer belongs to, preferring the `team_id` stamped
 * on the subscription at checkout over the `teams.stripe_customer_id` link.
 *
 * That ordering matters for first-time subscribers. Checkout creates the
 * customer with `customer_email` and no customer metadata, so
 * `handleCustomerEvent` can't link it; the link is written only when the
 * browser lands on /stripe/success. Stripe delivers
 * `customer.subscription.created` and `invoice.created` before that redirect
 * completes, so a customer-id-only lookup misses every new subscriber — and if
 * they close the tab, misses them permanently.
 *
 * Resolving via the hint also lets us repair the link here, which is why a
 * closed tab no longer strands a paying team.
 */
async function resolveTeam(
  {
    stripeCustomerId,
    teamIdHint,
  }: { stripeCustomerId: string; teamIdHint?: string | null },
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<TeamRow | null> {
  if (teamIdHint) {
    const byId = await supabaseServiceRole
      .from("teams")
      .select("id, payment_failed_at, stripe_customer_id")
      .eq("id", teamIdHint)
      .maybeSingle();

    if (byId.error) {
      throw new Error(
        `Failed to look up team ${teamIdHint}: ${byId.error.message}`,
      );
    }

    if (byId.data) {
      // Backfill the link the post-checkout redirect would otherwise own.
      // Guarded on NULL so a redelivery can never move an existing link.
      if (!byId.data.stripe_customer_id) {
        const linked = await supabaseServiceRole
          .from("teams")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", byId.data.id)
          .is("stripe_customer_id", null);

        if (linked.error) {
          throw new Error(
            `Failed to link customer ${stripeCustomerId} to team ${byId.data.id}: ${linked.error.message}`,
          );
        }
      }

      return { id: byId.data.id, payment_failed_at: byId.data.payment_failed_at };
    }
  }

  const byCustomer = await supabaseServiceRole
    .from("teams")
    .select("id, payment_failed_at")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (byCustomer.error) {
    throw new Error(
      `Failed to look up team for customer ${stripeCustomerId}: ${byCustomer.error.message}`,
    );
  }

  return byCustomer.data ?? null;
}

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
  {
    stripeCustomerId,
    teamIdHint,
  }: {
    stripeCustomerId: string;
    /**
     * `subscription.metadata.team_id`, stamped at checkout by
     * `buildSubscriptionMetadata`. Resolves the team before
     * `teams.stripe_customer_id` is linked — that link only happens when the
     * browser reaches /stripe/success, which these events race.
     */
    teamIdHint?: string | null;
  },
  supabaseServiceRole: SupabaseClient<Database>,
) {
  const team = await resolveTeam(
    { stripeCustomerId, teamIdHint },
    supabaseServiceRole,
  );

  if (!team) {
    // Genuinely no team owns this customer — a manual/one-off Stripe customer,
    // or a team that was deleted while its Stripe customer lived on. Retrying
    // can't fix that, and sustained 5xx makes Stripe disable the endpoint, so
    // this is logged and accepted. The hourly reconcile sweep is the backstop
    // for anything that *is* linked but out of sync.
    console.warn(
      `[subscription-health] No team for Stripe customer ${stripeCustomerId}; nothing to sync`,
    );
    return;
  }

  const { id: teamId, payment_failed_at: paymentFailedAt } = team;

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
