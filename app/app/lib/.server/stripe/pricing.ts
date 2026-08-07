import { stripe } from "./client";

/**
 * A subscription plan, derived DYNAMICALLY from Stripe — never hardcoded. A
 * Stripe product opts into being a billing tier by carrying `metadata.social_post_limit`
 * and having a recurring `default_price`; everything the dashboard needs to
 * display + select a plan is read from the product/price. Add or reprice a tier
 * in Stripe and it shows up here with no code change.
 */
export type PricingTier = {
  currency: string;
  /** The product's raw Stripe metadata, so callers can read allowance keys
   * (`social_post_limit`, and any future per-vertical limit) without a second
   * product fetch. Adding an allowance is then a Stripe edit, not a code change. */
  metadata: Record<string, string>;
  planName: string;
  /** Monthly post allowance — the tier's ordering key (higher = bigger plan). */
  postLimit: number;
  /** Recurring amount in major currency units (e.g. dollars). */
  price: number;
  priceId: string;
  productId: string;
};

/**
 * The product line this dashboard sells, as declared by `metadata.product_type`.
 *
 * Matching is NEGATIVE on purpose: a product is excluded only when it declares
 * a DIFFERENT vertical. Absence reads as social, because the marker post-dates
 * every product that exists today — requiring `=== "social"` would return an
 * empty catalog the moment this shipped, which silently breaks checkout, plan
 * selection, and tier classification all at once (everything would classify as
 * legacy). Tighten to a positive match once every live product carries it.
 */
const VERTICAL = "social";

/** The billing tiers, ascending by post limit. Read straight from Stripe on each
 * call — no cache, so adding/repricing a product in Stripe shows up immediately. */
export async function listPricingTiers(): Promise<PricingTier[]> {
  const products = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ["data.default_price"],
  });

  const tiers: PricingTier[] = [];
  for (const product of products.data) {
    const price = product.default_price;
    // Needs an expanded, recurring default price and an explicit post limit to
    // count as a tier — anything else (one-off products, add-ons) is skipped.
    if (!price || typeof price === "string" || !price.recurring) continue;
    // Another vertical's plan (e.g. a future `messages` tier) is a real product,
    // just not one of ours to sell here.
    const vertical = product.metadata?.product_type;
    if (vertical && vertical !== VERTICAL) continue;
    const postLimitRaw = product.metadata?.social_post_limit;
    if (!postLimitRaw) continue;
    const postLimit = Number(postLimitRaw);
    if (!Number.isFinite(postLimit)) continue;

    tiers.push({
      productId: product.id,
      priceId: price.id,
      planName: product.name,
      postLimit,
      price: (price.unit_amount ?? 0) / 100,
      currency: (price.currency ?? "usd").toUpperCase(),
      metadata: product.metadata ?? {},
    });
  }

  tiers.sort((a, b) => a.postLimit - b.postLimit);
  if (tiers.length === 0) {
    // The usual cause of a silent "can't start checkout": products exist but
    // none qualify as a tier. A tier needs ALL of: active, a recurring
    // `default_price`, and `metadata.social_post_limit`.
    console.warn(
      `[billing] listPricingTiers found 0 tiers from ${products.data.length} active product(s). ` +
        `Each tier product needs an active recurring default_price AND metadata.social_post_limit.`,
    );
  }
  return tiers;
}

/**
 * The plan to send a user to at checkout. Keyed off the expected monthly volume
 * captured during onboarding: the smallest tier that covers it; the largest if
 * volume exceeds every tier; the smallest when we have no signal.
 */
export function recommendedTier(
  volume: number | null | undefined,
  tiers: PricingTier[],
): PricingTier | null {
  if (tiers.length === 0) return null;
  if (volume != null && Number.isFinite(volume)) {
    return tiers.find((tier) => tier.postLimit >= volume) ?? tiers[tiers.length - 1];
  }
  return tiers[0];
}
