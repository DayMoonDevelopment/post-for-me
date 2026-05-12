import type { Database } from "~/lib/.server/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";

export async function handleCustomerEvent(
  customer: Stripe.Customer,
  supabaseServiceRole: SupabaseClient<Database>
) {
  // only update the team if the customer is a team without an existing customer id
  if (customer.metadata.team_id) {
    await supabaseServiceRole
      .from("teams")
      .update({
        stripe_customer_id: customer.id,
      })
      .eq("id", customer.metadata.team_id)
      .is("stripe_customer_id", null);
  }
}
