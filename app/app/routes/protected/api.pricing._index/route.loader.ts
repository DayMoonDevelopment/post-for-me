import { requireUser } from "~/lib/.server/guards";

import type { Route } from "./+types/route";

/**
 * `GET /api/pricing` — the billing tiers, as data, for the plan picker to fetch
 * lazily (so listing products doesn't hit Stripe on every page). Tiers are
 * team-agnostic. Guarded + dynamically imported so the route never depends on
 * Stripe being configured (the client module throws without a key).
 */
export async function loader({ context }: Route.LoaderArgs) {
  await requireUser(context);
  if (!process.env.STRIPE_SECRET_KEY) return { tiers: [] };

  const { listPricingTiers } = await import("~/lib/.server/stripe/pricing");
  return { tiers: await listPricingTiers() };
}
