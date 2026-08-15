import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";
import { handleSubscriptionHealthChange } from "~/lib/.server/handle-subscription-health-change.request";

/**
 * `subscription.metadata.team_id`, as snapshotted onto the invoice when it was
 * created.
 *
 * Same hint subscription-event.ts forwards, and it matters here for the same
 * reason: `invoice.created` for a first-time subscriber arrives before
 * /stripe/success writes `teams.stripe_customer_id`, so a customer-id-only
 * lookup finds no team and the event silently does nothing at all.
 *
 * Both shapes are read because webhook payloads are rendered with the
 * account's default API version rather than the SDK's:
 * `parent.subscription_details` is where Basil (2025-03-31) puts it,
 * `subscription_details` where every earlier version did.
 */
function resolveTeamIdHint(invoice: Stripe.Invoice): string | null {
  const preBasil = (
    invoice as unknown as {
      subscription_details?: { metadata?: Stripe.Metadata | null } | null;
    }
  ).subscription_details;

  return (
    invoice.parent?.subscription_details?.metadata?.team_id ??
    preBasil?.metadata?.team_id ??
    null
  );
}

export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  supabaseServiceRole: SupabaseClient<Database>
) {
  const customerId = invoice.customer as string;

  // The invoice itself says nothing about entitlement — handleSubscriptionHealthChange
  // re-derives it across every subscription the customer holds.
  await handleSubscriptionHealthChange(
    {
      stripeCustomerId: customerId,
      teamIdHint: resolveTeamIdHint(invoice),
    },
    supabaseServiceRole
  );
}
