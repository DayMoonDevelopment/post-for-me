import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";
import { handleSubscriptionHealthChange } from "~/lib/.server/handle-subscription-health-change.request";

export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  supabaseServiceRole: SupabaseClient<Database>
) {
  const customerId = invoice.customer as string;

  // The invoice itself says nothing about entitlement — handleSubscriptionHealthChange
  // re-derives it across every subscription the customer holds.
  await handleSubscriptionHealthChange(
    { stripeCustomerId: customerId },
    supabaseServiceRole
  );
}
