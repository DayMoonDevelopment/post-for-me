import type { SessionUser } from "~/lib/.server/services/auth.service";
import type { Team } from "~/lib/types/team";

import { fromStripe, UpstreamException } from "~/lib/.server/errors";
import { localPath } from "~/lib/.server/local-path";

import { stripe } from "./client";
import { listPricingTiers, recommendedTier } from "./pricing";

/**
 * The reusable billing operation: resolve where to send a team for billing.
 * Returns the **billing portal** when the team already has an active
 * subscription, else a **Checkout** session for the recommended tier. This is
 * the single `.server` implementation; the `api.*` and `redirect.*` adapters
 * both call it and only differ in how they deliver the URL ({ url } vs 302), so
 * they can't drift.
 *
 * Stamps `subscription_data.metadata.team_id` (+ `created_by`) for the API
 * webhook's entity mapping; no ad attribution (that's PostHog person props).
 */
export async function createBillingDestination({
  team,
  user,
  origin,
  volume,
  priceId,
  cancelTo,
  returnTo,
}: {
  /** Local path Checkout's "← back" returns to (its `cancel_url`). Carries the
   * flag that re-opens the plan picker; defaults to home. */
  cancelTo?: string | null;
  origin: string;
  /** The tier price the user picked. Validated against the live tiers — an
   * unknown/tampered value falls back to the volume-recommended tier. */
  priceId?: string | null;
  /** Local path the BILLING PORTAL returns to. Defaults to home, but callers
   * should pass the page the customer left, so "Return to Post for Me" lands
   * them exactly where they were rather than dumping them at the root. */
  returnTo?: null | string;
  team: Pick<Team, "id" | "stripeCustomerId" | "billingEmail">;
  user: SessionUser;
  /** Expected monthly post volume (from onboarding) used to pick the tier when
   * the user hasn't explicitly chosen one. */
  volume?: number | null;
}): Promise<{ url: string }> {
  try {
    // Existing customer with a live subscription → manage it in the portal.
    if (team.stripeCustomerId) {
      const active = await stripe.subscriptions.list({
        customer: team.stripeCustomerId,
        status: "active",
        limit: 1,
      });
      if (active.data.length > 0) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: team.stripeCustomerId,
          // A non-local `returnTo` isn't trusted — fall back to home.
          return_url: `${origin}${localPath(returnTo) ?? "/"}`,
        });
        return { url: portal.url };
      }
    }

    // Otherwise → Checkout. Honor the user's chosen price when it's a real tier;
    // otherwise fall back to the volume-recommended one (also guards tampering).
    const tiers = await listPricingTiers();
    const tier =
      (priceId && tiers.find((t) => t.priceId === priceId)) ||
      recommendedTier(volume ?? null, tiers);
    if (!tier) {
      // Our Stripe products aren't set up — a config problem, not the user's.
      throw new UpstreamException(
        "Billing isn't available right now. Please try again shortly.",
        {
          status: 503,
          message: `no tier resolved for team ${team.id} (volume=${volume ?? "none"}, tiers=${tiers.length})`,
          context: { teamId: team.id, volume, tierCount: tiers.length },
        },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: tier.priceId, quantity: 1 }],
      client_reference_id: team.id,
      customer: team.stripeCustomerId ?? undefined,
      // customer and customer_email are mutually exclusive in Checkout.
      customer_email: team.stripeCustomerId
        ? undefined
        : (team.billingEmail ?? undefined),
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { team_id: team.id, created_by: user.id },
      },
      success_url: `${origin}/callback/teams/${team.id}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      // "← back" in Checkout returns here — to the originating page with the flag
      // that re-opens the plan picker.
      cancel_url: `${origin}${cancelTo ?? "/"}`,
    });

    if (!session.url) {
      throw new UpstreamException("Couldn't start checkout. Please try again.", {
        message: "Stripe created a checkout session with no url",
        context: { teamId: team.id },
      });
    }
    return { url: session.url };
  } catch (error) {
    // A raw Stripe SDK error is mapped to a kind (+ context); our own AppExceptions
    // (no tier, no url) pass straight through.
    throw fromStripe(error, { context: { teamId: team.id } });
  }
}
