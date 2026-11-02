import type { PricingTier } from "~/lib/.server/stripe/pricing";

import { stripe } from "~/lib/.server/stripe/client";
import { listPricingTiers } from "~/lib/.server/stripe/pricing";

/**
 * Everything needed to classify a subscription's line items, read once per
 * sync. Stripe caps `expand` at four levels, so `data.items.data.price.product`
 * is rejected on a subscription list — product metadata has to be fetched
 * separately and joined by id, which is what this is.
 */
export interface ProductCatalog {
  /** productId → product metadata, INCLUDING archived products (a retired
   * legacy plan is exactly the kind of product that gets archived). */
  productMeta: Map<string, Record<string, string>>;
  /** Current-pricing tiers, derived from `metadata.social_post_limit`. */
  tiers: PricingTier[];
}

/** Cap the catalog read. Well above the ~12 products we have; if it's ever hit,
 * the overflow classifies as `unknown` rather than silently mis-classifying. */
const MAX_PRODUCTS = 300;

export async function loadProductCatalog(): Promise<ProductCatalog> {
  const [tiers, products] = await Promise.all([
    listPricingTiers(),
    // No `active` filter: archived products still back live subscriptions.
    stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: MAX_PRODUCTS }),
  ]);

  const productMeta = new Map<string, Record<string, string>>();
  for (const product of products) {
    productMeta.set(product.id, product.metadata ?? {});
  }

  return { tiers, productMeta };
}
