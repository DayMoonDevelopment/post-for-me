import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

const STRIPE_API_PRODUCT_ID = process.env.STRIPE_API_PRODUCT_ID || "";

// Vendored from dashboard's stripe.constants.ts; keep prices and env names in sync.
export const PRICING_TIERS = [
  { productId: process.env.STRIPE_PRICING_TIER_1K_PRODUCT_ID || "", name: "Pro", posts: 1000, price: 10 },
  { productId: process.env.STRIPE_PRICING_TIER_2_5K_PRODUCT_ID || "", name: "Pro", posts: 2500, price: 25 },
  { productId: process.env.STRIPE_PRICING_TIER_5K_PRODUCT_ID || "", name: "Pro", posts: 5000, price: 50 },
  { productId: process.env.STRIPE_PRICING_TIER_10K_PRODUCT_ID || "", name: "Pro", posts: 10000, price: 75 },
  { productId: process.env.STRIPE_PRICING_TIER_20K_PRODUCT_ID || "", name: "Pro", posts: 20000, price: 150 },
  { productId: process.env.STRIPE_PRICING_TIER_40K_PRODUCT_ID || "", name: "Pro", posts: 40000, price: 300 },
  { productId: process.env.STRIPE_PRICING_TIER_100K_PRODUCT_ID || "", name: "Pro", posts: 100000, price: 500 },
  { productId: process.env.STRIPE_PRICING_TIER_200K_PRODUCT_ID || "", name: "Pro", posts: 200000, price: 1000 },
].filter((tier) => tier.productId);

export type PlanInfo = {
  isLegacy: boolean;
  isNewPricing: boolean;
  productId: string | null;
  planName: string | null;
  postLimit: number | null;
  price: number | null;
  includesSystemCredentials: boolean;
};

export function getSubscriptionPlanInfo(
  subscription: Stripe.Subscription | null,
): PlanInfo {
  for (const item of subscription?.items.data ?? []) {
    const productId = typeof item.price.product === "string"
      ? item.price.product
      : item.price.product.id;
    const tier = PRICING_TIERS.find((entry) => entry.productId === productId);
    if (tier) {
      return {
        isLegacy: false,
        isNewPricing: true,
        productId: tier.productId,
        planName: tier.name,
        postLimit: tier.posts,
        price: tier.price,
        includesSystemCredentials: true,
      };
    }
  }

  const isLegacy = Boolean(STRIPE_API_PRODUCT_ID) && Boolean(
    subscription?.items.data.some((item) => {
      const product = item.price.product;
      return (typeof product === "string" ? product : product.id) === STRIPE_API_PRODUCT_ID;
    }),
  );
  return {
    isLegacy,
    isNewPricing: false,
    productId: isLegacy ? STRIPE_API_PRODUCT_ID : null,
    planName: isLegacy ? "Legacy Plan" : null,
    postLimit: null,
    price: null,
    includesSystemCredentials: false,
  };
}

export const SCHEDULE_METADATA_KEY = "schedule_type";
export const SCHEDULE_TYPE = {
  USAGE_BASED_UPGRADE: "usage_based_upgrade",
  ADDON_REMOVAL: "addon_removal",
} as const;
export type ScheduleType = (typeof SCHEDULE_TYPE)[keyof typeof SCHEDULE_TYPE];
export type ScheduleReleaseCriteria =
  | { mode: "all" }
  | { mode: "matching"; type: ScheduleType }
  | { mode: "excluding"; type: ScheduleType };

export async function releaseSchedulesForCustomer({
  stripeCustomerId,
  criteria,
}: {
  stripeCustomerId: string;
  criteria: ScheduleReleaseCriteria;
}): Promise<void> {
  let startingAfter: string | undefined;
  while (true) {
    const schedules = await stripe.subscriptionSchedules.list({
      customer: stripeCustomerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const schedule of schedules.data.filter((entry) => entry.status === "active")) {
      const type = schedule.metadata?.[SCHEDULE_METADATA_KEY];
      const matches = criteria.mode !== "all" && type === criteria.type;
      if (
        criteria.mode === "all" ||
        (criteria.mode === "matching" && matches) ||
        (criteria.mode === "excluding" && !matches)
      ) {
        await stripe.subscriptionSchedules.release(schedule.id);
      }
    }
    if (!schedules.has_more || schedules.data.length === 0) return;
    startingAfter = schedules.data[schedules.data.length - 1].id;
  }
}
