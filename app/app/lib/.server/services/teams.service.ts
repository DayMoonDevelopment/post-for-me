import type { Team } from "~/lib/types/team";

/** Reads the teams the current user can access. Returns app-native `Team` DTOs. */
export interface TeamsService {
  /**
   * Link a team to its Stripe customer after checkout. Idempotent and
   * only-when-unset, so it races safely with anything else that might link it.
   */
  linkStripeCustomer(teamId: string, stripeCustomerId: string): Promise<void>;
  list(): Promise<Team[]>;
}
