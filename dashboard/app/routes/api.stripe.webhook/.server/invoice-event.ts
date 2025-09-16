import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "@post-for-me/db";
import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";
import { customerHasActiveSubscriptions } from "~/lib/.server/customer-has-active-subscriptions.request";

export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  supabaseServiceRole: SupabaseClient<Database>
) {
  const customerId = invoice.customer as string;

  const isSubscriptionActive = await customerHasActiveSubscriptions(customerId);

  await updateAPIKeyAccess(
    {
      stripeCustomerId: customerId,
      enabled: isSubscriptionActive,
    },
    supabaseServiceRole
  );
}
