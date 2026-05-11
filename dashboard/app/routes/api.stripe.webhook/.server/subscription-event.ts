import { updateAPIKeyAccess } from "~/lib/.server/update-api-key-access.request";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stripe } from "stripe";
import type { Database } from "~/lib/.server/database.types";

export async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  supabaseServiceRole: SupabaseClient<Database>
) {
  const customerId = subscription.customer as string;
  const status = subscription.status;

  const isSubscriptionActive = status === "active" || status === "trialing";

  await updateAPIKeyAccess(
    {
      stripeCustomerId: customerId,
      enabled: isSubscriptionActive,
    },
    supabaseServiceRole
  );
}
