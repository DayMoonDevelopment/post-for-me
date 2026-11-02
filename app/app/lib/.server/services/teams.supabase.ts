import type { TypedSupabaseClient } from "~/lib/.server/supabase";
import type { Team } from "~/lib/types/team";

import { fromSupabase } from "~/lib/.server/errors";

import type { TeamsService } from "./teams.service";

/**
 * Supabase-backed {@link TeamsService}.
 *
 * Scoping is enforced by RLS: the per-request client carries the user's
 * session, so `select` only returns teams they're a member of (via the
 * `team_users` policy). The row→DTO mapper is the anti-corruption boundary —
 * nothing above this line sees a Supabase column name or the `teams` row shape.
 */
export function createSupabaseTeamsService(
  supabase: TypedSupabaseClient,
): TeamsService {
  return {
    async list(): Promise<Team[]> {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, stripe_customer_id, billing_email, created_by")
        .order("name");
      if (error) throw fromSupabase(error);
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        stripeCustomerId: row.stripe_customer_id,
        billingEmail: row.billing_email,
        createdBy: row.created_by,
      }));
    },

    async linkStripeCustomer(teamId, stripeCustomerId) {
      // Only-when-null so we never clobber an existing link (the
      // `webhook/stripe/customer-link` backstop may have set it first). RLS
      // keeps this scoped to the user's team.
      const { error } = await supabase
        .from("teams")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", teamId)
        .is("stripe_customer_id", null);
      if (error) throw fromSupabase(error);
    },
  };
}
