import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";
import { stripe } from "~/lib/.server/stripe";
import { handleSubscriptionHealthChange } from "~/lib/.server/handle-subscription-health-change.request";

export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  supabaseServiceRole: SupabaseClient<Database>
) {
  const customerId = invoice.customer as string;

  // Fetch the actual latest subscription status (not just an active/inactive
  // boolean) so handleSubscriptionHealthChange can tell a payment failure
  // (grace period) apart from an explicit cancellation (immediate revoke) —
  // same distinction subscription-event.ts gets for free from its event
  // payload.
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const latestStatus = subscriptions.data[0]?.status ?? null;

  await handleSubscriptionHealthChange(
    {
      stripeCustomerId: customerId,
      latestStatus,
    },
    supabaseServiceRole
  );
}
