import type Stripe from "stripe";

import { stripe } from "./client";
import { listPricingTiers } from "./pricing";

/**
 * Everything the Billing page displays, in ONE read. Display-shaped, not
 * domain-shaped: amounts are already in major units, timestamps are ISO strings,
 * and anything Stripe couldn't tell us is `null` rather than a guess.
 *
 * Deliberately separate from `subscription-access/` — that module answers
 * "may this team call the API?" and has to stay liftable into the API. This
 * answers "what should we show the human?", which needs price, invoice, and
 * usage detail the entitlement never carries.
 */
/**
 * What the plan grants. `null` means **no configured cap** — the allowance
 * isn't expressed in Stripe, and nothing in the product enforces one either, so
 * the page says "Unlimited" rather than inventing a number.
 *
 * Only `posts` is configured today (`social_post_limit`). The rest read metadata
 * keys that don't exist yet, so setting them in Stripe lights them up with no
 * code change — the same "markers are config, not code" rule the product
 * classifier follows.
 */
export interface PlanAllowances {
  feeds: null | number;
  postAnalytics: null | number;
  posts: null | number;
  quickstartProjects: null | number;
  socialAccounts: null | number;
  whiteLabelProjects: null | number;
}

interface ProductIndex {
  /** Products granting managed ("system") credentials, matched by metadata flag
   * rather than a hardcoded id — the same rule the rest of billing uses. */
  addonProductIds: Set<string>;
  /** Products declared deprecated (`metadata.is_legacy`). Lifecycle, not kind —
   * it sits on the old metered plan AND on the credentials add-on. */
  legacyProductIds: Set<string>;
  /** productId → the product's name in Stripe, so the page can show what the
   * customer is actually subscribed to instead of a label we invented. */
  nameById: Map<string, string>;
}

/** One products read serving both lookups. Archived products are included: a
 * retired plan or add-on can still back a live legacy subscription, and its name
 * is exactly what we need to display. */
async function loadProductIndex(): Promise<ProductIndex> {
  const products = await stripe.products
    .list({ limit: 100 })
    .autoPagingToArray({ limit: 300 });

  const addonProductIds = new Set<string>();
  const legacyProductIds = new Set<string>();
  const nameById = new Map<string, string>();
  for (const product of products) {
    nameById.set(product.id, product.name);
    if (product.metadata?.allows_system_credentials_access === "true") {
      addonProductIds.add(product.id);
    }
    if (product.metadata?.is_legacy === "true") {
      legacyProductIds.add(product.id);
    }
  }
  return { addonProductIds, legacyProductIds, nameById };
}

function productIdOf(item: Stripe.SubscriptionItem): string | undefined {
  const product = item.price.product;
  return typeof product === "string" ? product : product?.id;
}

/**
 * How posts are priced on a metered subscription.
 *
 * - `per_unit` — one rate for every post (`unitAmount`).
 * - `volume` — ALL posts priced at the tier the month's total lands in.
 * - `graduated` — each tier priced only for the posts that fall inside it.
 *
 * The distinction is the customer's whole bill, so it's carried through to the
 * UI rather than flattened into an "effective rate" we'd have to invent.
 */
export interface MeteredPricing {
  currency: string;
  mode: "graduated" | "per_unit" | "volume";
  tiers: { flatAmount: null | number; unitAmount: number; upTo: null | number }[];
  /** `per_unit` only; tiered prices carry their rates in `tiers`. */
  unitAmount: null | number;
}

/**
 * Read a metered item's pricing, fetching the price separately when it's tiered.
 *
 * `tiers` is not returned by default and CANNOT be expanded from the
 * subscription list — `data.items.data.price.tiers` is five levels deep and
 * Stripe caps expansion at four (the same wall `…price.product` hits). So a
 * tiered price needs its own retrieve.
 */
async function readMeteredPricing(
  item: Stripe.SubscriptionItem | undefined,
): Promise<MeteredPricing | null> {
  if (!item) return null;
  const price = item.price;
  const currency = (price.currency ?? "usd").toUpperCase();

  if (price.billing_scheme !== "tiered") {
    const unit =
      price.unit_amount_decimal != null
        ? Number(price.unit_amount_decimal) / 100
        : price.unit_amount != null
          ? price.unit_amount / 100
          : null;
    return { mode: "per_unit", currency, unitAmount: unit, tiers: [] };
  }

  try {
    const full = await stripe.prices.retrieve(price.id, { expand: ["tiers"] });
    return {
      mode: full.tiers_mode === "graduated" ? "graduated" : "volume",
      currency,
      unitAmount: null,
      tiers: (full.tiers ?? []).map((tier) => ({
        upTo: typeof tier.up_to === "number" ? tier.up_to : null,
        unitAmount:
          tier.unit_amount_decimal != null
            ? Number(tier.unit_amount_decimal) / 100
            : (tier.unit_amount ?? 0) / 100,
        flatAmount: tier.flat_amount != null ? tier.flat_amount / 100 : null,
      })),
    };
  } catch {
    // Pricing detail is informational — the usage count and the invoice still
    // render without it.
    return null;
  }
}

/** Stripe product metadata → allowance. Absent or unparseable reads as "no cap". */
function allowance(
  metadata: Record<string, string> | undefined,
  key: string,
): null | number {
  const raw = metadata?.[key];
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export interface BillingSummary {
  billingEmail: null | string;
  hasCustomer: boolean;
  /** The card the next invoice will charge. `null` when none is on file, or
   * when the default is a non-card method — we only claim what we can show. */
  paymentMethod: null | { brand: string; last4: string };
  plan: null | {
    allowances: PlanAllowances;
    currency: null | string;
    /** Whether any current tier sits ABOVE this plan's allowance. Drives
     * whether an upgrade is offered at all — on the top tier there is nothing
     * to upgrade to, and a picker that opens empty is worse than no button. */
    hasHigherTier: boolean;
    /** The "Managed System Credentials" add-on is ON this subscription as its
     * own line item. This is what a LEGACY plan's quickstart access hinges on —
     * legacy never bundles it, so the add-on's presence IS the answer. */
    hasManagedCredentialsAddon: boolean;
    /** Whether the plan-defining product matched a CURRENT tier — i.e. whether
     * we have an allowance, price and ladder position to render.
     *
     * This is the VIEW question, and it is deliberately not {@link isLegacy}.
     * An unrecognized product answers `false` here (render the metered shape,
     * which copes with a null limit) while answering `false` there too (don't
     * claim it's deprecated when we simply don't know). */
    hasTierData: boolean;
    /** Social-account feeds — and the post analytics served through them
     * (`expand=metrics`). The API gates `/social-account-feeds` on
     * `plan_type === "new_pricing"`, so only a CURRENT tier grants either. */
    includesFeeds: boolean;
    /** Quickstart access overall: every current tier bundles it, and a legacy
     * plan gets it only via {@link hasManagedCredentialsAddon}. */
    includesSystemCredentials: boolean;
    interval: null | string;
    /** Whether the plan is DECLARED deprecated (`metadata.is_legacy`) — the
     * upgrade-pitch question. A declaration, not the old `!tier` inference, so
     * a product we merely fail to recognize no longer gets told to upgrade. */
    isLegacy: boolean;
    /** How a METERED (legacy) subscription prices posts — the whole basis of
     * that billing model. `null` on a fixed tier, which bills a flat fee.
     *
     * Legacy prices come in both shapes: a flat per-unit rate, or volume /
     * graduated TIERS. A tiered price has no `unit_amount` at all, so anything
     * reading a single rate silently renders nothing for those customers. */
    meteredPricing: null | MeteredPricing;
    name: string;
    postLimit: null | number;
    /** Major currency units (dollars), already divided. */
    price: null | number;
  };
  subscription: null | {
    /** ISO date the subscription ends, when a cancellation is scheduled. */
    cancelAt: null | string;
    currentPeriodEnd: null | string;
    currentPeriodStart: null | string;
    status: Stripe.Subscription.Status;
  };
  upcomingInvoice: null | {
    currency: string;
    date: null | string;
    lines: InvoiceLine[];
    total: number;
  };
  /**
   * Metered posts for the current period. `limit` is the plan's allowance.
   *
   * `periodStart`/`periodEnd` are the BILLING period's real bounds — the cycle
   * the customer is in, matching the renewal date and the upcoming invoice. The
   * `used` count is necessarily measured only up to now, but showing "now" as
   * the period end made a month-long cycle read as one day.
   */
  usage: null | {
    limit: null | number;
    periodEnd: string;
    periodStart: string;
    used: number;
  };
}

/**
 * One line of the upcoming invoice, resolved to something a human reads.
 *
 * Stripe's own `description` is a machine sentence —
 * `"1 × Pro 1K (at $10.00 / month)"` — that repeats the amount already shown in
 * the column beside it. We resolve the line's PRODUCT instead and hand the parts
 * over separately, so the receipt can show the plan name with its allowance
 * underneath rather than one dense string.
 */
export interface InvoiceLine {
  amount: number;
  /** The product's name in Stripe, falling back to Stripe's description when a
   * line has no product (a discount, a credit, a proration adjustment). */
  name: string;
  /** A tier's monthly post allowance, for the sub-line. */
  postLimit: null | number;
  /** Units billed — the post count on a metered legacy line. */
  quantity: null | number;
}

/** Statuses where there's nothing left to display or manage (mirrors v1).
 *
 * `incomplete` is a checkout whose FIRST payment never succeeded — the customer
 * has no plan yet, so rendering one (with a renewal invoice they won't be
 * charged) would be inviting them to use something they haven't bought. It
 * belongs here alongside `incomplete_expired`, which is only the same checkout
 * once Stripe gives up on it 24h later. */
const DEAD_STATUSES = new Set<Stripe.Subscription.Status>([
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
]);

/** The meter that counts published posts. Resolved by EVENT NAME rather than a
 * hardcoded id — same spirit as deriving tiers from product metadata. */
const METER_EVENT_NAME = process.env.STRIPE_METER_EVENT ?? "post_successful";

const iso = (seconds: null | number | undefined) =>
  seconds == null ? null : new Date(seconds * 1000).toISOString();

const EMPTY: BillingSummary = {
  billingEmail: null,
  hasCustomer: false,
  paymentMethod: null,
  plan: null,
  subscription: null,
  upcomingInvoice: null,
  usage: null,
};

/**
 * The default card, via a single expand on the customer. Best-effort: a missing
 * or non-card payment method reads as `null` rather than failing the page, and
 * we never guess a brand we didn't get.
 */
async function readPaymentMethod(
  stripeCustomerId: string,
): Promise<BillingSummary["paymentMethod"]> {
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return null;
    const method = customer.invoice_settings?.default_payment_method;
    if (!method || typeof method === "string" || !method.card) return null;
    return { brand: method.card.brand, last4: method.card.last4 };
  } catch {
    return null;
  }
}

/** Total metered posts for the customer between two timestamps. Best-effort:
 * usage is informational, so a meter failure yields `null`, never an error. */
async function readUsage(
  stripeCustomerId: string,
  startTime: number,
  endTime: number,
): Promise<null | number> {
  try {
    const meters = await stripe.billing.meters.list({ status: "active", limit: 100 });
    const meter = meters.data.find((candidate) => candidate.event_name === METER_EVENT_NAME);
    if (!meter) return null;

    const summaries = await stripe.billing.meters.listEventSummaries(meter.id, {
      customer: stripeCustomerId,
      start_time: startTime,
      end_time: endTime,
    });
    return summaries.data.reduce(
      (total, summary) => total + (summary.aggregated_value || 0),
      0,
    );
  } catch (error) {
    console.warn(`[billing] usage read failed for ${stripeCustomerId}`, error);
    return null;
  }
}

/** The next invoice Stripe would cut for this subscription. Best-effort — a
 * preview isn't available for every subscription state. */
async function readUpcomingInvoice(
  subscriptionId: string,
  tiers: Awaited<ReturnType<typeof listPricingTiers>>,
  nameById: Map<string, string>,
): Promise<BillingSummary["upcomingInvoice"]> {
  try {
    const preview = await stripe.invoices.createPreview({ subscription: subscriptionId });
    return {
      total: preview.total / 100,
      currency: (preview.currency ?? "usd").toUpperCase(),
      date: iso(preview.next_payment_attempt ?? preview.created),
      lines: preview.lines.data.map((line) => {
        const productId = line.pricing?.price_details?.product ?? null;
        const tier = productId
          ? tiers.find((candidate) => candidate.productId === productId)
          : undefined;
        return {
          name:
            (productId ? nameById.get(productId) : undefined) ??
            line.description ??
            "",
          postLimit: tier?.postLimit ?? null,
          quantity: line.quantity,
          amount: line.amount / 100,
        };
      }),
    };
  } catch {
    return null;
  }
}

/**
 * Read a team's billing state for display.
 *
 * Every remote read is independently best-effort: a missing meter or an
 * unavailable invoice preview degrades that one section to `null` instead of
 * failing the page. The subscription itself is the only hard dependency, and
 * when there's no customer at all the page renders its "set up billing" state.
 */
export async function getBillingSummary(team: {
  billingEmail: null | string;
  stripeCustomerId: null | string;
}): Promise<BillingSummary> {
  if (!team.stripeCustomerId) {
    return { ...EMPTY, billingEmail: team.billingEmail };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: team.stripeCustomerId,
    status: "all",
    limit: 1,
    expand: ["data.items.data.price"],
  });
  const subscription = subscriptions.data[0];

  if (!subscription || DEAD_STATUSES.has(subscription.status)) {
    return { ...EMPTY, hasCustomer: true, billingEmail: team.billingEmail };
  }

  // A tier is a product carrying `social_post_limit`; deprecation is declared
  // separately via `is_legacy`, so the two are read independently below.
  let tiers: Awaited<ReturnType<typeof listPricingTiers>> = [];
  let index: ProductIndex = {
    addonProductIds: new Set<string>(),
    legacyProductIds: new Set<string>(),
    nameById: new Map<string, string>(),
  };
  try {
    [tiers, index] = await Promise.all([listPricingTiers(), loadProductIndex()]);
  } catch {
    // Plan naming is advisory — a pricing read failure shouldn't blank the page.
  }
  const { addonProductIds, legacyProductIds, nameById } = index;

  const items = subscription.items.data;
  const tierItem = items.find((item) =>
    tiers.some(
      (tier) =>
        tier.priceId === item.price.id ||
        tier.productId ===
          (typeof item.price.product === "string"
            ? item.price.product
            : item.price.product?.id),
    ),
  );
  const tier = tierItem
    ? tiers.find(
        (candidate) =>
          candidate.priceId === tierItem.price.id ||
          candidate.productId ===
            (typeof tierItem.price.product === "string"
              ? tierItem.price.product
              : tierItem.price.product?.id),
      )
    : undefined;

  // Is the add-on literally a line item on this subscription? Matched by PRODUCT
  // first (survives repricing, since a new price keeps the product), with the
  // price-level flag as a fallback for anything stamped only there.
  const hasManagedCredentialsAddon = items.some((item) => {
    const productId = productIdOf(item);
    return (
      (productId != null && addonProductIds.has(productId)) ||
      item.price.metadata?.allows_system_credentials_access === "true"
    );
  });

  // Current tiers bundle managed credentials; legacy plans get them only by
  // carrying the add-on.
  const includesSystemCredentials = Boolean(tier) || hasManagedCredentialsAddon;

  // Legacy is metered: how posts are priced is the headline for that model the
  // way the cap is for a tier.
  const meteredItem = items.find(
    (item) => item.price.recurring?.usage_type === "metered",
  );

  // The item that DEFINES the plan, by precedence — never `items[0]`. Stripe
  // doesn't order line items, so a legacy subscription can list the add-on
  // first, which would otherwise name the plan "Managed System Credentials".
  const primaryItem = tierItem ?? meteredItem ?? items[0];

  // Deprecation is read off the PLAN-DEFINING item only. Checking every item
  // would misfire on the credentials add-on, which is itself flagged legacy —
  // a team holding it isn't on a legacy plan because of it.
  const primaryProductId = primaryItem ? productIdOf(primaryItem) : undefined;
  const isLegacy =
    primaryItem?.price.metadata?.is_legacy === "true" ||
    (primaryProductId != null && legacyProductIds.has(primaryProductId));
  const periodStart = primaryItem?.current_period_start ?? null;
  const periodEnd = primaryItem?.current_period_end ?? null;

  const now = Math.floor(Date.now() / 1000);
  const [used, upcomingInvoice, meteredPricing, paymentMethod] = await Promise.all([
    // `periodStart >= now` only happens on a test-clock subscription advanced
    // into the future; the meter rejects a window that ends before it starts.
    periodStart && periodStart < now
      ? readUsage(team.stripeCustomerId, periodStart, now)
      : null,
    readUpcomingInvoice(subscription.id, tiers, nameById),
    readMeteredPricing(meteredItem),
    readPaymentMethod(team.stripeCustomerId),
  ]);

  return {
    hasCustomer: true,
    billingEmail: team.billingEmail,
    paymentMethod,
    subscription: {
      status: subscription.status,
      cancelAt: iso(subscription.cancel_at),
      currentPeriodStart: iso(periodStart),
      currentPeriodEnd: iso(periodEnd),
    },
    plan: {
      // Always the product's real name in Stripe — a tier's, or whatever the
      // legacy product is actually called. Never a label we made up, so support
      // and the customer are looking at the same words.
      name:
        tier?.planName ??
        (primaryItem ? nameById.get(productIdOf(primaryItem) ?? "") : undefined) ??
        "Legacy plan",
      postLimit: tier?.postLimit ?? null,
      price: tier?.price ?? null,
      currency: tier?.currency ?? null,
      interval: primaryItem?.price.recurring?.interval ?? null,
      hasTierData: Boolean(tier),
      isLegacy,
      includesSystemCredentials,
      // A legacy plan has no allowance to beat, so any tier is a step up.
      hasHigherTier: tiers.some(
        (candidate) => candidate.postLimit > (tier?.postLimit ?? -1),
      ),
      hasManagedCredentialsAddon,
      meteredPricing,
      // The API's feeds gate is `plan_type === "new_pricing"`, which is exactly
      // "this item matched a current tier".
      includesFeeds: Boolean(tier),
      allowances: {
        posts: tier?.postLimit ?? null,
        quickstartProjects: allowance(tier?.metadata, "quickstart_project_limit"),
        whiteLabelProjects: allowance(tier?.metadata, "white_label_project_limit"),
        socialAccounts: allowance(tier?.metadata, "social_account_limit"),
        feeds: allowance(tier?.metadata, "feed_limit"),
        postAnalytics: allowance(tier?.metadata, "post_analytics_limit"),
      },
    },
    usage:
      used == null || periodStart == null
        ? null
        : {
            used,
            limit: tier?.postLimit ?? null,
            periodStart: new Date(periodStart * 1000).toISOString(),
            // The cycle's end, not `now` — `now` is only the meter query's
            // upper bound, and printing it made the period look one day long.
            periodEnd:
              iso(periodEnd) ?? new Date(now * 1000).toISOString(),
          },
    upcomingInvoice,
  };
}
