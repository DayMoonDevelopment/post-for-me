import type { Project } from "./project";

/**
 * A team (tenant) the current user belongs to.
 *
 * App-native DTO: the stable shape loaders, actions, and components consume,
 * deliberately decoupled from whatever backend produced it (Supabase today,
 * the native API later). The data source can change without any consumer
 * noticing — the mapping lives inside the service adapter, not here.
 */
/**
 * A team with its projects nested in — the view-model the app shells' loaders
 * compose from the flat `teams`/`projects` services, and the shape the context
 * switcher and both sidebars consume.
 */
export interface TeamWithProjects extends Team {
  projects: Project[];
}

export interface Team {
  /** Billing contact email, when set. */
  billingEmail: string | null;
  /** The user who created (and therefore owns) the team. */
  createdBy: string | null;
  id: string;
  name: string;
  /** The Stripe customer linked to this team's billing, once checkout has run.
   * Null until the team has gone through Stripe. */
  stripeCustomerId: string | null;
}
