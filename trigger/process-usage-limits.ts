import { logger, schedules, tasks } from "@trigger.dev/sdk";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "@post-for-me/db";
import { randomUUID } from "crypto";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY!);
const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

type TeamUsageWindow = Database["public"]["Tables"]["team_usage"]["Row"];
type TeamUsageWindowWithTeam = TeamUsageWindow & {
  teams: {
    stripe_customer_id: string | null;
  } | null;
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

const getProductIdFromPrice = async (
  price: string | Stripe.Price,
): Promise<string | null> => {
  if (typeof price !== "string") {
    const product = price.product;
    if (typeof product === "string") {
      return product;
    }

    return product?.id ?? null;
  }

  const stripePrice = await stripe.prices.retrieve(price);
  const product = stripePrice.product;

  if (typeof product === "string") {
    return product;
  }

  return product?.id ?? null;
};

const getExceededUsageWindows = async (): Promise<
  TeamUsageWindowWithTeam[]
> => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseClient
    .from("team_usage")
    .select(
      "team_id, count, limit, start_at, end_at, teams!inner(stripe_customer_id)",
    )
    .filter("count", "gt", "limit")
    .lte("start_at", nowIso)
    .gt("end_at", nowIso);

  if (error) {
    throw error;
  }

  return data ?? [];
};

const getPreviousUsageWindow = async (
  teamId: string,
  currentWindow: TeamUsageWindow,
): Promise<TeamUsageWindow | null> => {
  const { data, error } = await supabaseClient
    .from("team_usage")
    .select("team_id, count, limit, start_at, end_at")
    .eq("team_id", teamId)
    .lte("end_at", currentWindow.start_at)
    .order("end_at", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

const hasUsageNotificationForPeriod = async (
  teamId: string,
  periodStart: string,
  periodEnd: string,
): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from("team_notifications")
    .select("id")
    .eq("notification_type", "usage_alert")
    .eq("team_id", teamId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
};

const maybeTriggerUsageNotification = async ({
  teamId,
  periodStart,
  periodEnd,
  message,
  metadata,
}: {
  teamId: string;
  periodStart: string;
  periodEnd: string;
  message: string;
  metadata: Json;
}): Promise<boolean> => {
  const alreadySent = await hasUsageNotificationForPeriod(
    teamId,
    periodStart,
    periodEnd,
  );

  if (alreadySent) {
    logger.info("Usage notification already sent for period", {
      team_id: teamId,
      period_start: periodStart,
      period_end: periodEnd,
    });
    return false;
  }

  await triggerTeamNotification(teamId, message, metadata);
  return true;
};

const getActiveScheduleForSubscription = async (
  stripeCustomerId: string,
  subscriptionId: string,
): Promise<Stripe.SubscriptionSchedule | null> => {
  const activeSchedules = await stripe.subscriptionSchedules.list({
    customer: stripeCustomerId,
  });

  return (
    activeSchedules.data.find((entry: Stripe.SubscriptionSchedule) => {
      if (entry.status !== "active") {
        return false;
      }

      if (typeof entry.subscription === "string") {
        return entry.subscription === subscriptionId;
      }

      return entry.subscription?.id === subscriptionId;
    }) ?? null
  );
};

const getScheduledTierForSubscription = async ({
  schedule,
  currentPeriodEnd,
}: {
  schedule: Stripe.SubscriptionSchedule;
  currentPeriodEnd: number;
}): Promise<(typeof PRICING_TIERS)[number] | null> => {
  const upgradePhase = schedule.phases.find(
    (phase) => phase.start_date >= currentPeriodEnd,
  );

  if (!upgradePhase) {
    return null;
  }

  for (const item of upgradePhase.items) {
    const productId = await getProductIdFromPrice(
      item.price as string | Stripe.Price,
    );

    if (!productId) {
      continue;
    }

    const tier = PRICING_TIERS.find(
      (candidate) => candidate.productId === productId,
    );

    if (tier) {
      return tier;
    }
  }

  return null;
};

const scheduleUpgrade = async ({
  stripeCustomerId,
  subscription,
  currentPlanItem,
  currentPeriodEnd,
  nextTier,
}: {
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
  currentPlanItem: Stripe.SubscriptionItem;
  currentPeriodEnd: number;
  nextTier: (typeof PRICING_TIERS)[number];
}): Promise<void> => {
  const nextTierProduct = await stripe.products.retrieve(nextTier.productId);
  const nextTierPriceId = getDefaultPriceId(nextTierProduct);

  const activeSchedules = await stripe.subscriptionSchedules.list({
    customer: stripeCustomerId,
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

  const currentPhaseItems = subscription.items.data.map((subscriptionItem) => ({
    price: subscriptionItem.price.id,
    quantity: subscriptionItem.quantity ?? 1,
  }));

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
};

export const processUsageLimits = schedules.task({
  cron: { pattern: "*/5 * * * *", environments: ["PRODUCTION"] },
  id: "process-usage-limits",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    try {
      const exceededUsageWindows = await getExceededUsageWindows();

      if (exceededUsageWindows.length === 0) {
        logger.info("No teams currently over usage limits");
        return;
      }

      for (const usageWindow of exceededUsageWindows) {
        const {
          team_id: teamId,
          count: usage,
          limit: currentLimit,
          teams,
        } = usageWindow;

        try {
          const stripeCustomerId = teams?.stripe_customer_id ?? null;

          if (!stripeCustomerId) {
            logger.info("Skipping team without Stripe customer", {
              team_id: teamId,
            });
            continue;
          }

          const previousUsageWindow = await getPreviousUsageWindow(
            teamId,
            usageWindow,
          );
          const previousLimit = previousUsageWindow?.limit ?? null;
          const exceededPreviousLimit =
            previousLimit !== null && usage > previousLimit;

          if (!exceededPreviousLimit) {
            await maybeTriggerUsageNotification({
              teamId,
              periodStart: usageWindow.start_at,
              periodEnd: usageWindow.end_at,
              message: `Usage exceeded current plan limit (${usage}/${currentLimit} posts used this period).`,
              metadata: {
                transactional_email_id:
                  LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID,
                previous_limit: previousLimit,
                ...currentPlanMetadata,
              },
            });
            continue;
          }

          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: "active",
            limit: 1,
            expand: ["data.items.data.price"],
          });

          const subscription = subscriptions.data[0] as Stripe.Subscription;

          if (!subscription) {
            logger.error("No active subscription for customer", {
              stripe_customer_id: stripeCustomerId,
              team_id: teamId,
            });
            continue;
          }

          const planInfo = getSubscriptionPlanInfo(subscription);

          if (planInfo.isLegacy || !planInfo.postLimit) {
            logger.info("Skipping usage-limit automation for subscription", {
              team_id: teamId,
              subscription_id: subscription.id,
              is_legacy: planInfo.isLegacy,
              post_limit: planInfo.postLimit,
            });
            continue;
          }

          const currentPlanItem = subscription.items.data.find(
            (subscriptionItem) =>
              subscriptionItem.price.product === planInfo.productId,
          );

          if (!currentPlanItem) {
            logger.error("Could not find current plan item", {
              team_id: teamId,
              subscription_id: subscription.id,
              product_id: planInfo.productId,
            });
            continue;
          }

          const currentPeriodEnd = currentPlanItem.current_period_end;

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

          await maybeTriggerUsageNotification({
            teamId,
            periodStart: usageWindow.start_at,
            periodEnd: usageWindow.end_at,
            message: `Usage exceeded current and previous plan limits (${usage}/${currentLimit} posts used this period).`,
            metadata: {
              transactional_email_id:
                LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID,
              previous_limit: previousLimit,
              ...currentPlanMetadata,
            },
          });

          const activeSchedule = await getActiveScheduleForSubscription(
            stripeCustomerId,
            subscription.id,
          );

          if (activeSchedule) {
            const scheduledTier = await getScheduledTierForSubscription({
              schedule: activeSchedule,
              currentPeriodEnd,
            });

            if (!scheduledTier) {
              logger.info("Active schedule found without mapped upgrade tier", {
                team_id: teamId,
                subscription_id: subscription.id,
                schedule_id: activeSchedule.id,
              });
              continue;
            }

            if (usage <= scheduledTier.posts) {
              logger.info("Usage still within already scheduled upgrade tier", {
                team_id: teamId,
                subscription_id: subscription.id,
                usage,
                scheduled_tier_posts: scheduledTier.posts,
              });
              continue;
            }

            const scheduledTierIndex = PRICING_TIERS.findIndex(
              (tier) => tier.productId === scheduledTier.productId,
            );
            const nextScheduledTier = PRICING_TIERS[scheduledTierIndex + 1];

            if (!nextScheduledTier) {
              logger.info("Scheduled upgrade already at highest pricing tier", {
                team_id: teamId,
                subscription_id: subscription.id,
                usage,
                scheduled_tier: scheduledTier,
              });
              continue;
            }

            await scheduleUpgrade({
              stripeCustomerId,
              subscription,
              currentPlanItem,
              currentPeriodEnd,
              nextTier: nextScheduledTier,
            });

            logger.info("Replaced scheduled upgrade with next tier", {
              team_id: teamId,
              subscription_id: subscription.id,
              previous_scheduled_tier: scheduledTier.productId,
              next_scheduled_tier: nextScheduledTier.productId,
            });
            continue;
          }

          const currentTierIndex = PRICING_TIERS.findIndex(
            (tier) => tier.productId === planInfo.productId,
          );
          const nextTier = PRICING_TIERS[currentTierIndex + 1];

          if (!nextTier) {
            logger.info("Team is already on highest pricing tier", {
              team_id: teamId,
              subscription_id: subscription.id,
            });
            continue;
          }

          await scheduleUpgrade({
            stripeCustomerId,
            subscription,
            currentPlanItem,
            currentPeriodEnd,
            nextTier,
          });

          logger.info("Scheduled usage-based upgrade to next tier", {
            team_id: teamId,
            subscription_id: subscription.id,
            next_tier: nextTier.productId,
          });
        } catch (teamError) {
          logger.error("Error processing team usage limits", {
            team_id: teamId,
            error: teamError,
          });
        }
      }
    } catch (error) {
      logger.error("Error processing usage limits", { error });
      throw error;
    }
  },
});
