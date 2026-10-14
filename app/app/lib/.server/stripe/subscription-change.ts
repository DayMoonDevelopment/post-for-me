import type Stripe from "stripe";

import { UpstreamException, ValidationException } from "~/lib/.server/errors";

import { stripe } from "./client";
import { listPricingTiers } from "./pricing";

/**
 * In-app subscription changes — the half of billing we do NOT hand to Stripe's
 * customer portal. The portal keeps only the payment-instrument flows; choosing
 * and switching plans happens here so the product owns the experience.
 *
 * ## Two upgrade models, because the plans bill differently
 *
 * **Tier → tier** (both prepaid, same shape): prorate and KEEP the cycle.
 *
 * ```
 * proration_behavior: "always_invoice"   — bill the difference immediately
 * (billing_cycle_anchor untouched)       — the renewal date does not move
 * ```
 *
 * Halfway through a month, Pro 1K → Pro 2.5K invoices the difference and
 * nothing else:
 *
 * ```
 * · Unused time on Pro 1K       = -$10
 * · Remaining time on Pro 2.5K  = +$25
 * ```
 *
 * **Legacy → tier** (metered arrears → prepaid): settle what's owed, prepay the
 * new plan, restart the clock.
 *
 * ```
 * proration_behavior: "none"      — no proration credits or "remaining time" lines
 * billing_cycle_anchor: "now"     — closes the old period and starts a fresh month
 * ```
 *
 * ```
 * · 50 × Social Post API Usage   =  $5   ← metered usage to date
 * · 1 × Pro 1K                   = $10   ← new plan, prepaid
 * ```
 *
 * Prorating a metered plan makes no sense — there's no unused prepaid time to
 * credit — and **both of its settings are load-bearing**: `proration_behavior:
 * "none"` on its own, without the anchor reset, silently DROPS accrued usage
 * (measured, not assumed). The anchor reset is what closes the period and forces
 * the usage to invoice. Don't remove one without the other.
 *
 * Deliberately not doing: crediting the unused remainder of a prepaid add-on on
 * the legacy path. Considered and declined — small, and the extra credit line
 * costs more in explanation than it returns.
 */

/**
 * What the change will cost, straight from Stripe rather than derived — so the
 * confirmation screen shows the number that will actually be invoiced.
 *
 * Two amounts, because the anchor-reset model produces two: what's collected
 * the moment they confirm (arrears + the new plan's first month) and what
 * recurs afterward.
 */
export interface UpgradePreview {
  /** Collected immediately on confirm. */
  chargedToday: number;
  currency: string;
  /** The plan being left. `null` when there's nothing comparable — a legacy
   * plan has no monthly price to put beside the new one. */
  current: null | { amount: null | number; name: string };
  /** Itemization of today's charge, as Stripe describes it. */
  lines: { amount: number; description: string }[];
  /** The plan being moved to. */
  next: { amount: number; name: string };
  /** The recurring charge from the next period onward. */
  renewalAmount: number;
  /** ISO date the newly-started period renews. */
  renewsOn: null | string;
}

/** The live subscription we'd change, if there is one. */
async function liveSubscription(
  stripeCustomerId: string,
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });
  return (
    subscriptions.data.find((subscription) =>
      ["active", "past_due", "trialing"].includes(subscription.status),
    ) ?? null
  );
}

/** Resolve a client-supplied price to a REAL current tier. Never trust the id
 * off the wire — it decides what we charge. */
async function requireTier(priceId: string) {
  const tiers = await listPricingTiers();
  const tier = tiers.find((candidate) => candidate.priceId === priceId);
  if (!tier) {
    throw new ValidationException("That plan isn't available.", {
      message: `price ${priceId} is not a current pricing tier`,
      context: { priceId },
    });
  }
  return tier;
}

/** A metered item means the plan bills in arrears — the legacy shape. */
function isMetered(subscription: Stripe.Subscription): boolean {
  return subscription.items.data.some(
    (item) => item.price.recurring?.usage_type === "metered",
  );
}

/**
 * The item set that turns an existing subscription into `priceId`.
 *
 * A tier→tier move REPLACES the price on the existing item, so Stripe can
 * credit its unused time; deleting and re-adding would look like a cancel plus
 * a new subscription and lose the proration. Anything else (legacy, add-ons)
 * is cleared out and replaced.
 */
function switchToTierItems(
  subscription: Stripe.Subscription,
  priceId: string,
): Stripe.SubscriptionUpdateParams.Item[] {
  const items = subscription.items.data;
  if (!isMetered(subscription) && items.length === 1) {
    return [{ id: items[0].id, price: priceId }];
  }
  return [
    ...items.map((item) => ({ id: item.id, deleted: true })),
    { price: priceId },
  ];
}

/**
 * How the change is billed — see the module doc. Returned as one object so the
 * PREVIEW and the COMMIT can never drift: the quote is produced by the same
 * parameters that produce the invoice.
 */
function changeBehavior(
  subscription: Stripe.Subscription,
): Pick<
  Stripe.SubscriptionUpdateParams,
  "billing_cycle_anchor" | "proration_behavior"
> {
  return isMetered(subscription)
    ? { billing_cycle_anchor: "now", proration_behavior: "none" }
    : { proration_behavior: "always_invoice" };
}

/**
 * What the upgrade would cost, previewed with the SAME parameters the commit
 * uses — so the number on the confirm screen is the number on the invoice.
 */
export async function previewTierUpgrade(
  stripeCustomerId: string,
  priceId: string,
): Promise<null | UpgradePreview> {
  const tier = await requireTier(priceId);
  const subscription = await liveSubscription(stripeCustomerId);
  if (!subscription) return null;

  try {
    const preview = await stripe.invoices.createPreview({
      customer: stripeCustomerId,
      subscription: subscription.id,
      subscription_details: {
        items: switchToTierItems(subscription, priceId),
        ...changeBehavior(subscription),
      },
    });

    // The plan being left, for the side-by-side. A metered legacy item has no
    // monthly price, so its amount is null rather than a misleading 0.
    const tiers = await listPricingTiers();
    const currentItem = subscription.items.data.find((item) => {
      const product = item.price.product;
      const productId = typeof product === "string" ? product : product?.id;
      return tiers.some(
        (candidate) =>
          candidate.priceId === item.price.id ||
          candidate.productId === productId,
      );
    });
    const currentTier = currentItem
      ? tiers.find((candidate) => candidate.priceId === currentItem.price.id)
      : undefined;
    const currentProduct = currentItem?.price.product;
    const currentName =
      currentTier?.planName ??
      (currentProduct && typeof currentProduct !== "string" && !currentProduct.deleted
        ? currentProduct.name
        : null);

    // The line for the tier we're moving TO carries the period the new cycle
    // covers — its end is the next renewal.
    const tierLine = preview.lines.data.find(
      (line) => line.pricing?.price_details?.price === priceId,
    );
    const renewsOn = tierLine?.period?.end
      ? new Date(tierLine.period.end * 1000).toISOString()
      : null;

    return {
      chargedToday: preview.total / 100,
      currency: (preview.currency ?? "usd").toUpperCase(),
      current: currentName
        ? { name: currentName, amount: currentTier?.price ?? null }
        : null,
      next: { name: tier.planName, amount: tier.price },
      renewalAmount: tier.price,
      renewsOn,
      lines: preview.lines.data.map((line) => ({
        description: line.description ?? "",
        amount: line.amount / 100,
      })),
    };
  } catch (error) {
    throw new UpstreamException("Couldn't price that change. Please try again.", {
      message: error instanceof Error ? error.message : "invoice preview failed",
      cause: error,
      context: { stripeCustomerId, priceId },
    });
  }
}

export interface UpgradeResult {
  planName: string;
  /** ISO date the newly-started period renews. */
  renewsAt: null | string;
  subscriptionId: string;
}

/**
 * Move the team onto `priceId` now: old items out, tier in, period restarted.
 * Stripe invoices and charges the default payment method immediately.
 *
 * A declined card leaves the invoice open and the subscription `past_due` —
 * which the churn webhook treats as non-entitling, so it would disable the
 * team's API keys. Callers must surface a failure rather than swallow it.
 */
export async function upgradeToTier(
  stripeCustomerId: string,
  priceId: string,
): Promise<UpgradeResult> {
  const tier = await requireTier(priceId);
  const subscription = await liveSubscription(stripeCustomerId);
  if (!subscription) {
    throw new ValidationException("This team has no subscription to change.", {
      message: `no live subscription for ${stripeCustomerId}`,
      context: { stripeCustomerId },
    });
  }

  try {
    const updated = await stripe.subscriptions.update(subscription.id, {
      items: switchToTierItems(subscription, priceId),
      ...changeBehavior(subscription),
    });
    const periodEnd = updated.items.data[0]?.current_period_end ?? null;
    return {
      subscriptionId: updated.id,
      planName: tier.planName,
      renewsAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    };
  } catch (error) {
    throw new UpstreamException("Couldn't change the plan. Please try again.", {
      message: error instanceof Error ? error.message : "subscription update failed",
      cause: error,
      context: { stripeCustomerId, priceId, subscriptionId: subscription.id },
    });
  }
}
