import { logger, task, tasks } from "@trigger.dev/sdk";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "@post-for-me/db";
import { isWithinInterval } from "date-fns";
import { randomUUID } from "crypto";

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
const LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID =
  process.env?.LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID || "";
const LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID =
  process.env?.LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID || "";

const USAGE_LIMIT_ALERT_MESSAGE =
  "You've exceeded your monthly usage limit. Upgrade your plan to keep publishing without interruption.";

const UPGRADE_SCHEDULED_MESSAGE =
  "Your plan has been upgraded. The new usage limit will apply at the start of your next billing period.";

export type ProcessUsageLimitsPayload = {
  stripe_customer_id: string;
  team_id: string;
};

const triggerTeamNotification = async (
  teamId: string,
  message: string,
  metadata: Json,
): Promise<void> => {
  await tasks.trigger("process-team-notification", {
    id: `tn_${randomUUID()}`,
    team_id: teamId,
    project_id: null,
    notification_type: "usage_alert",
    delivery_type: "email",
    message,
    meta_data: metadata,
    created_at: new Date().toISOString(),
  });
};

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

const getSubscriptionPlanInfo = (subscription: Stripe.Subscription) => {
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
};

const getDefaultPriceId = (product: Stripe.Product): string => {
  const defaultPrice = product.default_price;

  if (!defaultPrice) {
    throw new Error("Stripe product has no default price");
  }

  if (typeof defaultPrice === "string") {
    return defaultPrice;
  }

  return defaultPrice.id;
};

export const processUsageLimits = task({
  id: "process-usage-limits",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async (payload: ProcessUsageLimitsPayload) => {
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

        const subscription = subscriptions.data[0] as Stripe.Subscription;

        if (!subscription) {
          logger.error("No active subscirpiton for customer", { subscription });
          return;
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

        const currentPlanItem = subscription.items.data.find(
          (subscriptionItem) =>
            subscriptionItem.price.product === planInfo.productId,
        );

        if (!currentPlanItem) {
          logger.error("Could not find current plan item", {
            subscriptionId: subscription.id,
            productId: planInfo.productId,
          });
          return;
        }

        const startTime = currentPlanItem.current_period_start;
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

        if (usage <= planInfo.postLimit) {
          logger.info("Usage is within subscription limits");
          return;
        }

        const { data: lastNotification, error: lastNotificationError } =
          await supabaseClient
            .from("team_notifications")
            .select("created_at")
            .eq("notification_type", "usage_alert")
            .eq("team_id", team_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastNotificationError) {
          logger.error("Failed to fetch last usage notification", {
            error: lastNotificationError,
            team_id,
          });
          return;
        }

        const currentPeriodStart = currentPlanItem.current_period_start;
        const currentPeriodEnd = currentPlanItem.current_period_end;
        const periodDuration = currentPeriodEnd - currentPeriodStart;
        const previousPeriodStart = currentPeriodStart - periodDuration;

        const lastNotificationDate = lastNotification
          ? new Date(lastNotification.created_at)
          : null;

        const currentPlanMetadata = {
          plan_info: {
            current_plan: {
              product_id: planInfo.productId,
              name: planInfo.planName,
              post_limit: planInfo.postLimit,
              price: planInfo.price,
            },
          },
        };

        if (!lastNotificationDate) {
          await triggerTeamNotification(team_id, USAGE_LIMIT_ALERT_MESSAGE, {
            transactional_email_id: LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID,
            ...currentPlanMetadata,
          });
          return;
        }

        switch (true) {
          //Notificaiont is in current subscripion period
          case isWithinInterval(lastNotificationDate, {
            start: new Date(currentPeriodStart),
            end: new Date(currentPeriodEnd),
          }): {
            logger.info("Usage notification already sent this period", {
              team_id,
              subscription_id: subscription.id,
              period: {
                lastNotificationDate,
                start: new Date(currentPeriodStart),
                end: new Date(currentPeriodEnd),
              },
            });

            return;
          }
          //Notification is in previous subscription period
          case isWithinInterval(lastNotificationDate, {
            start: new Date(previousPeriodStart),
            end: new Date(currentPeriodStart),
          }): {
            const currentTierIndex = PRICING_TIERS.findIndex(
              (tier) => tier.productId === planInfo.productId,
            );
            const nextTier = PRICING_TIERS[currentTierIndex + 1];

            if (!nextTier) {
              logger.info("Team is already on highest pricing tier", {
                team_id,
                subscription_id: subscription.id,
              });
              return;
            }

            const nextTierProduct = await stripe.products.retrieve(
              nextTier.productId,
            );
            const nextTierPriceId = getDefaultPriceId(nextTierProduct);

            const activeSchedules = await stripe.subscriptionSchedules.list({
              customer: stripe_customer_id,
            });

            for (const schedule of activeSchedules.data.filter(
              (entry: Stripe.SubscriptionSchedule) => entry.status === "active",
            )) {
              await stripe.subscriptionSchedules.release(schedule.id);
            }

            const schedule = await stripe.subscriptionSchedules.create({
              from_subscription: subscription.id,
            });

            const firstPhase = schedule.phases[0];

            if (!firstPhase) {
              logger.error("Missing subscription schedule phase", {
                schedule_id: schedule.id,
                subscription_id: subscription.id,
              });
              return;
            }

            const currentPhaseItems = subscription.items.data.map(
              (subscriptionItem) => ({
                price: subscriptionItem.price.id,
                quantity: subscriptionItem.quantity ?? 1,
              }),
            );

            const nextPhaseItems = [
              {
                price: nextTierPriceId,
                quantity: currentPlanItem.quantity ?? 1,
              },
            ];

            await stripe.subscriptionSchedules.update(schedule.id, {
              end_behavior: "release",
              phases: [
                {
                  start_date: firstPhase.start_date,
                  end_date: currentPeriodEnd,
                  items: currentPhaseItems,
                  proration_behavior: "none",
                },
                {
                  start_date: currentPeriodEnd,
                  items: nextPhaseItems,
                  proration_behavior: "none",
                },
              ],
            });

            await triggerTeamNotification(team_id, UPGRADE_SCHEDULED_MESSAGE, {
              transactional_email_id:
                LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID,
              plan_info: {
                ...currentPlanMetadata.plan_info,
                next_plan: {
                  product_id: nextTier.productId,
                  name: nextTier.name,
                  post_limit: nextTier.posts,
                  price: nextTier.price,
                },
              },
            });
            return;
          }
          default: {
            await triggerTeamNotification(team_id, USAGE_LIMIT_ALERT_MESSAGE, {
              transactional_email_id: LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID,
              ...currentPlanMetadata,
            });
            return;
          }
        }
      } catch (error) {
        logger.error("Error fetching usage from Stripe:", error);
      }
    }
  },
});
