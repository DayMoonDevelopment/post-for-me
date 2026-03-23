import { logger, task } from "@trigger.dev/sdk";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@post-for-me/db";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY!);
const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STRIPE_METER_EVENT = process.env.STRIPE_METER_EVENT || "successful_post";

const STRIPE_PRICING_TIER_1K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_1K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_2_5K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_2_5K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_5K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_5K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_10K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_10K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_20K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_20K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_40K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_40K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_100K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_100K_PRODUCT_ID || "";
const STRIPE_PRICING_TIER_200K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_200K_PRODUCT_ID || "";

const STRIPE_API_PRODUCT_ID = process.env?.STRIPE_API_PRODUCT_ID || "";

const PRICING_TIERS = [
  {
    productId: STRIPE_PRICING_TIER_1K_PRODUCT_ID,
    name: "Pro",
    posts: 1000,
    price: 10,
  },
  {
    productId: STRIPE_PRICING_TIER_2_5K_PRODUCT_ID,
    name: "Pro",
    posts: 2500,
    price: 25,
  },
  {
    productId: STRIPE_PRICING_TIER_5K_PRODUCT_ID,
    name: "Pro",
    posts: 5000,
    price: 50,
  },
  {
    productId: STRIPE_PRICING_TIER_10K_PRODUCT_ID,
    name: "Pro",
    posts: 10000,
    price: 75,
  },
  {
    productId: STRIPE_PRICING_TIER_20K_PRODUCT_ID,
    name: "Pro",
    posts: 20000,
    price: 150,
  },
  {
    productId: STRIPE_PRICING_TIER_40K_PRODUCT_ID,
    name: "Pro",
    posts: 40000,
    price: 300,
  },
  {
    productId: STRIPE_PRICING_TIER_100K_PRODUCT_ID,
    name: "Pro",
    posts: 100000,
    price: 500,
  },
  {
    productId: STRIPE_PRICING_TIER_200K_PRODUCT_ID,
    name: "Pro",
    posts: 200000,
    price: 1000,
  },
];

// Array of all new pricing tier product IDs for easy checking
const NEW_PRICING_TIER_PRODUCT_IDS = [
  STRIPE_PRICING_TIER_1K_PRODUCT_ID,
  STRIPE_PRICING_TIER_2_5K_PRODUCT_ID,
  STRIPE_PRICING_TIER_5K_PRODUCT_ID,
  STRIPE_PRICING_TIER_10K_PRODUCT_ID,
  STRIPE_PRICING_TIER_20K_PRODUCT_ID,
  STRIPE_PRICING_TIER_40K_PRODUCT_ID,
  STRIPE_PRICING_TIER_100K_PRODUCT_ID,
  STRIPE_PRICING_TIER_200K_PRODUCT_ID,
].filter(Boolean); // Filter out empty strings

function getSubscriptionPlanInfo(subscription: Stripe.Subscription) {
  // Check if subscription has any new pricing tier products
  for (const item of subscription.items.data) {
    const productId = item.price.product as string;
    if (NEW_PRICING_TIER_PRODUCT_IDS.includes(productId)) {
      const tier = PRICING_TIERS.find((t) => t.productId === productId);
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
  }

  const hasLegacyProduct = subscription.items.data.some(
    (item) => item.price.product === STRIPE_API_PRODUCT_ID,
  );

  if (hasLegacyProduct) {
    return {
      isLegacy: true,
      isNewPricing: false,
      productId: STRIPE_API_PRODUCT_ID,
      planName: "Legacy Plan",
      postLimit: null,
      price: null,
      includesSystemCredentials: false,
    };
  }

  return {
    isLegacy: false,
    isNewPricing: false,
    productId: null,
    planName: null,
    postLimit: null,
    price: null,
    includesSystemCredentials: false,
  };
}

export const processUsageLimits = task({
  id: "process-usage-limits",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async (payload: { stripe_customer_id: string; team_id: string }) => {
    const { stripe_customer_id, team_id } = payload;

    logger.info("Checking usage for customer", { stripe_customer_id, team_id });

    if (stripe_customer_id && STRIPE_METER_EVENT) {
      try {
        // Get the active subscription to determine the billing period
        const subscriptions = await stripe.subscriptions.list({
          customer: stripe_customer_id,
          status: "active",
          limit: 1,
          expand: ["data.items.data.price"],
        });

        const subscription = subscriptions.data[0];

        if (!subscription) {
          logger.error("No active subscirpiton for customer", { subscription });
        }
        // Get plan info to determine post limit
        const planInfo = getSubscriptionPlanInfo(subscription);

        if (planInfo.isLegacy) {
          logger.info("Legacy subscription no usage limit to check");
          return;
        }

        if (!planInfo.postLimit) {
          logger.error("Error getting post limit", { planInfo });
          return;
        }

        const item = subscription.items.data[0];
        const startTime = item.current_period_start;
        const endTime = Math.floor(Date.now() / 1000);

        // Query meter event summaries for the current subscription period
        const meterEventSummaries =
          await stripe.billing.meters.listEventSummaries(STRIPE_METER_EVENT, {
            customer: stripe_customer_id,
            start_time: startTime,
            end_time: endTime,
          });

        // Sum up the usage from all meter event summaries
        const usage = meterEventSummaries.data.reduce(
          (sum: number, summary: { aggregated_value?: number }) =>
            sum + (summary.aggregated_value || 0),
          0,
        );

        if (usage > planInfo.postLimit) {
          //TODO:: Check last notification and insert team notificaiton based on status of last notification.
        }
      } catch (error) {
        logger.error("Error fetching usage from Stripe:", error);
      }
    }
  },
});
