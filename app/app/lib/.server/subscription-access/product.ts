import type Stripe from "stripe";

import type { PricingTier } from "~/lib/.server/stripe/pricing";

import type { ProductCatalog } from "./catalog";

/**
 * What KIND of thing a subscription line item is. Classification is a separate
 * step from handling: {@link identifyProductType} decides, and exactly one
 * `handle*Product` turns that kind into plan facts. A new kind of product means
 * a new arm plus a new handler — never widening an existing one.
 *
 * - `tier` — a current-pricing plan (product carries `metadata.social_post_limit`).
 * - `legacy` — an old plan, flagged `metadata.is_legacy = "true"`.
 * - `addon` — sold alongside a plan, never defines one. Identified by the
 *   entitlement it grants (`metadata.allows_system_credentials_access`), not by
 *   a dedicated marker — see the caveat below.
 * - `unknown` — unclassified. Access still follows the SUBSCRIPTION's status;
 *   only the advisory plan metadata is withheld.
 *
 * ## The three Stripe markers
 *
 * - `social_post_limit` (product) — a tier's allowance, and by extension its
 *   identity. A CONTRACT: the usage trigger jobs read it straight off Stripe.
 * - `allows_system_credentials_access` (price) — grants Quickstart. Also a
 *   contract, and here it does double duty as the add-on's identity.
 * - `is_legacy` (product) — lifecycle, not kind. Absence means current. It sits
 *   on the old metered plan and on the credentials add-on, because both are
 *   things we'd like a customer to move off of.
 *
 * ## `is_legacy` is not `plan_type`
 *
 * Don't conflate these; they point opposite directions. `is_legacy` is an INPUT
 * on the Stripe product — ours alone, read only here. `plan_type` is an OUTPUT
 * stamped onto the API KEY by {@link PlanFacts}, and a cross-service CONTRACT:
 * the API gates social-account-feeds on `plan_type === "new_pricing"`.
 *
 * ## Known limit of identifying an add-on by its entitlement
 *
 * This works because managed credentials is currently our ONLY add-on. A second
 * add-on granting something else (a volume discount, extra seats) carries no
 * `allows_system_credentials_access`, so it lands in `unknown` — which is a
 * plan-defining kind. It stays harmless only because
 * {@link PLAN_DEFINING_PRECEDENCE} ranks `legacy` above `unknown`, so a real
 * plan on the same subscription still wins. Introduce an add-on that can appear
 * WITHOUT a plan beside it and that safety net is gone; at that point give
 * add-ons a marker of their own.
 */
export type ProductType = "addon" | "legacy" | "tier" | "unknown";

/** The plan facts one line item contributes: `plan_*` meta for the key, plus
 * whether it grants managed ("system") credentials. */
export interface PlanFacts {
  planMeta: Record<string, string>;
  systemCredentials: boolean;
}

/** Which kinds can define the team's plan, best first. Stripe doesn't order
 * line items meaningfully, so a subscription's plan is chosen by precedence —
 * never by taking `items.data[0]`. */
const PLAN_DEFINING_PRECEDENCE: ProductType[] = ["tier", "legacy", "unknown"];

export function productIdOf(item: Stripe.SubscriptionItem): string | undefined {
  const product = item.price.product;
  return typeof product === "string" ? product : product?.id;
}

/** Read a marker off the item: the PRICE first (more specific), then the
 * PRODUCT (more durable — repricing mints a new price but keeps the product). */
function markerOf(
  item: Stripe.SubscriptionItem,
  field: string,
  catalog: ProductCatalog,
): string | undefined {
  const onPrice = item.price.metadata?.[field];
  if (onPrice) return onPrice;
  const productId = productIdOf(item);
  return productId ? catalog.productMeta.get(productId)?.[field] : undefined;
}

/** The current-pricing tier this item is, if any. */
export function tierFor(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): PricingTier | undefined {
  const productId = productIdOf(item);
  return catalog.tiers.find(
    (tier) => tier.priceId === item.price.id || tier.productId === productId,
  );
}

/**
 * Classify ONE line item.
 *
 * ORDER IS LOAD-BEARING, and not for the usual "most specific first" reason.
 * The managed-credentials add-on carries BOTH markers — it grants system
 * credentials AND it's a legacy artifact (current tiers bundle credentials, so
 * the add-on is only ever attached to an old plan). Check `addon` before
 * `legacy` or the add-on becomes plan-defining and a legacy team's plan name
 * reads "Managed Social App Credentials" instead of their actual plan.
 *
 * A current tier still wins over everything: the catalog is derived from
 * `social_post_limit`, which a tier must carry anyway, so it can't disagree
 * with itself.
 *
 * Corollary worth knowing before editing Stripe: putting
 * `allows_system_credentials_access` on a PLAN product would reclassify it as
 * an add-on and leave the team looking planless. That flag belongs only on
 * things sold alongside a plan.
 */
export function identifyProductType(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): ProductType {
  if (tierFor(item, catalog)) return "tier";
  if (grantsSystemCredentialsAddon(item, catalog)) return "addon";
  if (markerOf(item, "is_legacy", catalog) === "true") return "legacy";
  return "unknown";
}

/**
 * The managed-credentials entitlement as sold to legacy plans: an explicit flag
 * on the price or product (today, the "Managed System Credentials" line item).
 * Current tiers include it without carrying the flag.
 */
export function grantsSystemCredentialsAddon(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): boolean {
  return markerOf(item, "allows_system_credentials_access", catalog) === "true";
}

/** A current-pricing plan. Every current tier bundles managed credentials. */
export function handleTierProduct(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): PlanFacts {
  const tier = tierFor(item, catalog);
  if (!tier) return { planMeta: {}, systemCredentials: false };
  return {
    planMeta: {
      plan_product_id: tier.productId,
      plan_name: tier.planName,
      plan_post_limit: String(tier.postLimit),
      plan_type: "new_pricing",
    },
    systemCredentials: true,
  };
}

/**
 * An old plan: defines the team's plan and carries no post limit.
 *
 * `systemCredentials: false` unconditionally — an item carrying the credentials
 * flag is classified `addon` before it can reach here, so reading the flag
 * again would be dead code that reads like a decision. A legacy team gets
 * Quickstart through the SEPARATE add-on line item, whose facts merge in
 * alongside these.
 */
export function handleLegacyProduct(
  item: Stripe.SubscriptionItem,
  _catalog: ProductCatalog,
): PlanFacts {
  const planMeta: Record<string, string> = { plan_type: "legacy" };
  const productId = productIdOf(item);
  if (productId) planMeta.plan_product_id = productId;
  return { planMeta, systemCredentials: false };
}

/** Sold alongside a plan — contributes entitlements, never plan identity. */
export function handleAddonProduct(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): PlanFacts {
  return {
    planMeta: {},
    systemCredentials: grantsSystemCredentialsAddon(item, catalog),
  };
}

/** Unclassified: no guessed plan name or limit. The add-on flag is still safe
 * to read — it's explicit wherever it appears. */
export function handleUnknownProduct(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): PlanFacts {
  const planMeta: Record<string, string> = { plan_type: "unknown" };
  const productId = productIdOf(item);
  if (productId) planMeta.plan_product_id = productId;
  return {
    planMeta,
    systemCredentials: grantsSystemCredentialsAddon(item, catalog),
  };
}

/** Dispatch one item to its handler — the ONLY place the kind→handler mapping
 * lives. */
export function factsForItem(
  item: Stripe.SubscriptionItem,
  catalog: ProductCatalog,
): PlanFacts {
  switch (identifyProductType(item, catalog)) {
    case "addon":
      return handleAddonProduct(item, catalog);
    case "legacy":
      return handleLegacyProduct(item, catalog);
    case "tier":
      return handleTierProduct(item, catalog);
    case "unknown":
      return handleUnknownProduct(item, catalog);
  }
}

/** The item that defines the plan, chosen by {@link PLAN_DEFINING_PRECEDENCE}
 * across every line item of every entitling subscription. */
export function planDefiningItem(
  items: Stripe.SubscriptionItem[],
  catalog: ProductCatalog,
): Stripe.SubscriptionItem | undefined {
  for (const kind of PLAN_DEFINING_PRECEDENCE) {
    const match = items.find((item) => identifyProductType(item, catalog) === kind);
    if (match) return match;
  }
  return undefined;
}
