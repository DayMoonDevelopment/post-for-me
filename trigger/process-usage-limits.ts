import { logger, schedules, tasks } from "@trigger.dev/sdk";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "./supabase.types";
import { captureServerEvent, deterministicUuid } from "./posthog";
import { randomUUID } from "crypto";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const supabaseClient = createClient<Database>(
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
// One shared template for all three thresholds — the crossed percent is sent
// as `threshold_percent`/`usage_percent` in the Loops data payload, so the
// template branches copy/subject on that instead of needing a template per
// tier.
const LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID =
  process.env?.LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID || "";

type TeamUsageWindow =
  Database["public"]["Tables"]["social_post_team_usage"]["Row"];
type ExceededUsageWindow =
  Database["public"]["Functions"]["get_exceeded_team_usage_windows"]["Returns"][number];
type ActiveUsageWindow =
  Database["public"]["Functions"]["get_active_team_usage_windows"]["Returns"][number];
type TeamNotificationType =
  Database["public"]["Tables"]["team_notifications"]["Row"]["notification_type"];

export const USAGE_WARNING_THRESHOLDS = [
  {
    percent: 95,
    notificationType: "usage_alert_95",
    notificationTemplate: "usage_threshold_alert_95",
  },
  {
    percent: 90,
    notificationType: "usage_alert_90",
    notificationTemplate: "usage_threshold_alert_90",
  },
  {
    percent: 80,
    notificationType: "usage_alert_80",
    notificationTemplate: "usage_threshold_alert_80",
  },
] as const satisfies {
  percent: number;
  notificationType: TeamNotificationType;
  notificationTemplate: string;
}[];

type UsageEmailTemplate =
  | "usage_limit_alert"
  | "usage_limit_upgrade"
  | (typeof USAGE_WARNING_THRESHOLDS)[number]["notificationTemplate"];

// Returns the highest threshold whose percent has been crossed. Does not
// depend on array order, so appending a new threshold can't silently change
// which one wins.
export const getCrossedUsageThreshold = (percentage: number) =>
  USAGE_WARNING_THRESHOLDS.filter(
    (threshold) => percentage >= threshold.percent,
  ).reduce<(typeof USAGE_WARNING_THRESHOLDS)[number] | null>(
    (highest, candidate) =>
      !highest || candidate.percent > highest.percent ? candidate : highest,
    null,
  );

const triggerTeamNotification = async (
  teamId: string,
  message: string,
  metadata: Json,
  notificationType: TeamNotificationType = "usage_alert",
): Promise<void> => {
  await tasks.trigger("process-team-notification", {
    id: `tn_${randomUUID()}`,
    team_id: teamId,
    project_id: null,
    notification_type: notificationType,
    delivery_types: ["email"],
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

export const getSubscriptionPlanInfo = (subscription: Stripe.Subscription) => {
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

export const hasScheduledCancellation = (
  subscription: Stripe.Subscription,
): boolean => {
  return Boolean(
    subscription.cancel_at_period_end ||
      subscription.cancel_at ||
      subscription.cancellation_details?.reason,
  );
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

type EligibleSubscriptionPlan = {
  subscription: Stripe.Subscription;
  planInfo: ReturnType<typeof getSubscriptionPlanInfo>;
  currentPlanItem: Stripe.SubscriptionItem;
  currentPeriodEnd: number;
  nextTier: (typeof PRICING_TIERS)[number] | null;
};

/**
 * Shared eligibility resolution for both the exceeded-usage (100%) and the
 * active-usage threshold-warning (80/90/95%) flows, so a team on a legacy
 * plan, without a Stripe customer, or with a scheduled cancellation is
 * excluded consistently from both email paths rather than drifting apart.
 */
export const getEligibleSubscriptionPlan = async ({
  teamId,
  stripeCustomerId,
}: {
  teamId: string;
  stripeCustomerId: string | null;
}): Promise<EligibleSubscriptionPlan | null> => {
  if (!stripeCustomerId) {
    logger.info("Skipping team without Stripe customer", { team_id: teamId });
    return null;
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
    return null;
  }

  const planInfo = getSubscriptionPlanInfo(subscription);

  if (planInfo.isLegacy || !planInfo.postLimit) {
    logger.info("Skipping usage-limit automation for subscription", {
      team_id: teamId,
      subscription_id: subscription.id,
      is_legacy: planInfo.isLegacy,
      post_limit: planInfo.postLimit,
    });
    return null;
  }

  if (hasScheduledCancellation(subscription)) {
    logger.info(
      "Skipping usage-limit automation for subscription with scheduled cancellation",
      {
        team_id: teamId,
        subscription_id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at,
      },
    );
    return null;
  }

  const currentPlanItem = subscription.items.data.find(
    (subscriptionItem) => subscriptionItem.price.product === planInfo.productId,
  );

  if (!currentPlanItem) {
    logger.error("Could not find current plan item", {
      team_id: teamId,
      subscription_id: subscription.id,
      product_id: planInfo.productId,
    });
    return null;
  }

  const currentPeriodEnd = currentPlanItem.current_period_end;
  const currentTierIndex = PRICING_TIERS.findIndex(
    (tier) => tier.productId === planInfo.productId,
  );
  const nextTier =
    currentTierIndex >= 0 ? (PRICING_TIERS[currentTierIndex + 1] ?? null) : null;

  return {
    subscription,
    planInfo,
    currentPlanItem,
    currentPeriodEnd,
    nextTier,
  };
};

const getExceededUsageWindows = async (): Promise<ExceededUsageWindow[]> => {
  const { data, error } = await supabaseClient.rpc(
    "get_exceeded_team_usage_windows",
  );

  if (error) {
    throw error;
  }

  return data ?? [];
};

const getActiveUsageWindows = async (): Promise<ActiveUsageWindow[]> => {
  const { data, error } = await supabaseClient.rpc(
    "get_active_team_usage_windows",
  );

  if (error) {
    throw error;
  }

  return data ?? [];
};

const hasExceededPreviouseLimit = async (
  teamId: string,
  currentWindow: TeamUsageWindow,
): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from("social_post_team_usage")
    .select("team_id, count, limit, start_at, end_at")
    .eq("team_id", teamId)
    .lte("end_at", currentWindow.start_at)
    .order("end_at", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("Unable to get previouse usage window");
    return false;
  }

  if (!data) {
    return false;
  }

  return data.count > data.limit;
};

const hasUsageNotificationForPeriod = async (
  teamId: string,
  notificationType: TeamNotificationType,
  periodStart: string,
  periodEnd: string,
): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from("team_notifications")
    .select("id")
    .eq("notification_type", notificationType)
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

/**
 * True if the team was already notified this period at `threshold` or any
 * higher threshold. Prevents a later downward usage recalculation (e.g. a
 * Stripe-derived backfill) from firing a lower-severity warning after a
 * higher one has already gone out.
 */
export const hasHigherOrEqualUsageNotification = async (
  teamId: string,
  threshold: (typeof USAGE_WARNING_THRESHOLDS)[number],
  periodStart: string,
  periodEnd: string,
): Promise<boolean> => {
  const thresholdsAtOrAbove = USAGE_WARNING_THRESHOLDS.filter(
    (candidate) => candidate.percent >= threshold.percent,
  );

  const results = await Promise.all(
    thresholdsAtOrAbove.map((candidate) =>
      hasUsageNotificationForPeriod(
        teamId,
        candidate.notificationType,
        periodStart,
        periodEnd,
      ),
    ),
  );

  return results.some(Boolean);
};

const maybeTriggerUsageNotification = async ({
  teamId,
  notificationType,
  periodStart,
  periodEnd,
  message,
  metadata,
  checkForDuplicates,
}: {
  teamId: string;
  notificationType: TeamNotificationType;
  periodStart: string;
  periodEnd: string;
  message: string;
  metadata: Json;
  checkForDuplicates: boolean;
}): Promise<boolean> => {
  if (checkForDuplicates) {
    const alreadySent = await hasUsageNotificationForPeriod(
      teamId,
      notificationType,
      periodStart,
      periodEnd,
    );

    if (alreadySent) {
      logger.info("Usage notification already sent for period", {
        team_id: teamId,
        notification_type: notificationType,
        period_start: periodStart,
        period_end: periodEnd,
      });
      return false;
    }
  }

  logger.info("Triggering usage notification", {
    team_id: teamId,
    notification_type: notificationType,
    period_start: periodStart,
    period_end: periodEnd,
  });
  await triggerTeamNotification(teamId, message, metadata, notificationType);
  return true;
};

const getActiveScheduleForSubscription = async (
  stripeCustomerId: string,
  subscriptionId: string,
): Promise<Stripe.SubscriptionSchedule | null> => {
  const activeSchedules = await stripe.subscriptionSchedules.list({
    customer: stripeCustomerId,
  });
  const todayUnix = Math.floor(Date.now() / 1000);

  return (
    activeSchedules.data.find((entry: Stripe.SubscriptionSchedule) => {
      if (entry.status !== "active") {
        return false;
      }

      const hasNextPhaseInFuture = entry.phases.some(
        (phase) => phase.start_date > todayUnix,
      );

      if (!hasNextPhaseInFuture) {
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

/**
 * Shared metadata builder for both the exceeded-usage (100%) and the
 * active-usage threshold-warning (80/90/95%) flows, so the Loops/PostHog
 * payload shape can't drift between the two email paths.
 */
const buildUsageEmailMetadata = ({
  teamId,
  teamName,
  usage,
  currentLimit,
  currentPlanPostLimit,
  currentPlanName,
  suggestedTier,
  periodStart,
  transactionalEmailId,
  notificationTemplate,
  thresholdPercent,
}: {
  teamId: string;
  teamName: string | null;
  usage: number;
  currentLimit: number;
  currentPlanPostLimit: number | null;
  currentPlanName: string | null;
  suggestedTier: (typeof PRICING_TIERS)[number] | null;
  periodStart: string;
  transactionalEmailId: string;
  notificationTemplate: UsageEmailTemplate;
  thresholdPercent?: number;
}): Json => ({
  // Stamped for analytics: process-team-notification reads the
  // semantic intent (`notification_category` + `notification_template`)
  // and `tracking` to fire the generic `notification_sent` event once
  // Loops confirms delivery. The channel + provider are added by the
  // consumer. Kept out of `data.loops.data` so these analytics-only
  // fields aren't forwarded to Loops as email variables.
  notification_category: "transactional",
  notification_template: notificationTemplate,
  tracking: {
    usage_count: usage,
    current_limit: currentLimit,
    plan_post_limit: currentPlanPostLimit,
    suggested_plan_post_limit: suggestedTier?.posts ?? null,
    period_start: periodStart,
    ...(thresholdPercent !== undefined
      ? { threshold_percent: thresholdPercent }
      : {}),
  },
  data: {
    loops: {
      transactional_id: transactionalEmailId,
      data: {
        team_id: teamId,
        team_name: teamName,
        posts_used: usage,
        usage_percent:
          currentLimit > 0 ? Math.round((usage / currentLimit) * 100) : 0,
        current_plan_post_limit: currentPlanPostLimit,
        current_plan_name: currentPlanName,
        suggested_plan_name: suggestedTier?.name ?? null,
        suggested_plan_post_limit: suggestedTier?.posts ?? null,
        billing_link: `https://app.postforme.dev/${teamId}/billing`,
        team_link: `https://app.postforme.dev/${teamId}/billing`,
        ...(thresholdPercent !== undefined
          ? { threshold_percent: thresholdPercent }
          : {}),
      },
    },
  },
  results: [],
});

/**
 * Emit `subscription_upgrade_scheduled` for the automated usage-based upgrade.
 * Attributed to the team's owner (`created_by`) as the distinct_id and the
 * `team` group — billing reports run against the team. `system_triggered: true`
 * marks this as automation; events without that flag are implied human-driven.
 */
const trackUpgradeScheduled = async ({
  teamId,
  stripeCustomerId,
  subscription,
  fromProductId,
  toTier,
  previousScheduledProductId,
  usage,
  currentLimit,
}: {
  teamId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
  fromProductId: string | null;
  toTier: (typeof PRICING_TIERS)[number];
  previousScheduledProductId?: string | null;
  usage: number;
  currentLimit: number;
}): Promise<void> => {
  try {
    const { data: team } = await supabaseClient
      .from("teams")
      .select("created_by")
      .eq("id", teamId)
      .maybeSingle();

    const distinctId = team?.created_by;
    if (!distinctId) {
      // No owner to attribute to — skip rather than fabricate a person.
      return;
    }

    const postLimitOf = (productId: string | null | undefined) =>
      productId
        ? PRICING_TIERS.find((tier) => tier.productId === productId)?.posts ??
          null
        : null;

    const isEscalation = previousScheduledProductId != null;

    await captureServerEvent({
      distinctId,
      event: "subscription_upgrade_scheduled",
      teamId,
      properties: {
        team_id: teamId,
        stripe_customer_id: stripeCustomerId,
        subscription_id: subscription.id,
        system_triggered: true,
        is_escalation: isEscalation,
        from_post_limit: postLimitOf(fromProductId),
        to_post_limit: toTier.posts,
        previous_scheduled_post_limit: isEscalation
          ? postLimitOf(previousScheduledProductId)
          : null,
        usage_count: usage,
        current_limit: currentLimit,
      },
      dedupeKey: deterministicUuid(
        `subscription_upgrade_scheduled:${subscription.id}:${toTier.productId}`,
      ),
    });
  } catch (error) {
    logger.error("Failed to track subscription_upgrade_scheduled", {
      error,
      team_id: teamId,
    });
  }
};

export const processUsageLimits = schedules.task({
  cron: { pattern: "*/5 * * * *", environments: ["PRODUCTION"] },
  id: "process-usage-limits",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    try {
      logger.info("Starting usage limit processing");

      // Fetched concurrently: the two RPCs are independent (disjoint
      // count > limit / count <= limit windows) and this keeps the two
      // snapshots close together in time rather than taking the active
      // snapshot only after every exceeded team's Stripe calls finish.
      const [exceededUsageWindows, activeUsageWindows] = await Promise.all([
        getExceededUsageWindows(),
        getActiveUsageWindows(),
      ]);

      if (exceededUsageWindows.length === 0) {
        logger.info("No teams currently over usage limits");
      }

      for (const usageWindow of exceededUsageWindows) {
        const {
          team_id: teamId,
          count: usage,
          limit: currentLimit,
          stripe_customer_id: stripeCustomerId,
          team_name: teamName,
        } = usageWindow;

        logger.info("Processing exceeded usage window", {
          team_id: teamId,
          team_name: teamName,
          stripe_customer_id: stripeCustomerId,
          usage_window_start_at: usageWindow.start_at,
          usage_window_end_at: usageWindow.end_at,
          usage_count: usage,
          usage_limit: currentLimit,
        });

        try {
          if (!stripeCustomerId) {
            logger.info("Skipping team without Stripe customer", {
              team_id: teamId,
            });
            continue;
          }

          const exceededPreviousLimit = await hasExceededPreviouseLimit(
            teamId,
            usageWindow,
          );

          const eligiblePlan = await getEligibleSubscriptionPlan({
            teamId,
            stripeCustomerId,
          });

          if (!eligiblePlan) {
            continue;
          }

          const {
            subscription,
            planInfo,
            currentPlanItem,
            currentPeriodEnd,
            nextTier,
          } = eligiblePlan;

          if (!nextTier) {
            logger.info("Team is already on highest pricing tier", {
              team_id: teamId,
              subscription_id: subscription.id,
            });
            continue;
          }

          if (!exceededPreviousLimit) {
            await maybeTriggerUsageNotification({
              teamId,
              notificationType: "usage_alert",
              periodStart: usageWindow.start_at,
              periodEnd: usageWindow.end_at,
              message: `Usage exceeded current plan limit (${usage}/${currentLimit} posts used this period).`,
              metadata: buildUsageEmailMetadata({
                teamId,
                teamName,
                usage,
                currentLimit,
                currentPlanPostLimit: planInfo.postLimit,
                currentPlanName: planInfo.planName,
                suggestedTier: nextTier,
                periodStart: usageWindow.start_at,
                transactionalEmailId: LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID,
                notificationTemplate: "usage_limit_alert",
              }),
              checkForDuplicates: true,
            });
            continue;
          }

          const activeSchedule = await getActiveScheduleForSubscription(
            stripeCustomerId,
            subscription.id,
          );

          if (!activeSchedule) {
            await scheduleUpgrade({
              stripeCustomerId,
              subscription,
              currentPlanItem,
              currentPeriodEnd,
              nextTier,
            });

            await maybeTriggerUsageNotification({
              teamId,
              notificationType: "usage_alert",
              periodStart: usageWindow.start_at,
              periodEnd: usageWindow.end_at,
              message: `Usage exceeded current and previous plan limits (${usage}/${currentLimit} posts used this period).`,
              metadata: buildUsageEmailMetadata({
                teamId,
                teamName,
                usage,
                currentLimit,
                currentPlanPostLimit: planInfo.postLimit,
                currentPlanName: planInfo.planName,
                suggestedTier: nextTier,
                periodStart: usageWindow.start_at,
                transactionalEmailId: LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID,
                notificationTemplate: "usage_limit_upgrade",
              }),
              checkForDuplicates: false,
            });

            logger.info("Scheduled usage-based upgrade to next tier", {
              team_id: teamId,
              subscription_id: subscription.id,
              next_tier: nextTier.productId,
            });

            await trackUpgradeScheduled({
              teamId,
              stripeCustomerId,
              subscription,
              fromProductId: planInfo.productId,
              toTier: nextTier,
              usage,
              currentLimit,
            });

            continue;
          }

          const scheduledTier = await getScheduledTierForSubscription({
            schedule: activeSchedule,
            currentPeriodEnd,
          });

          if (!scheduledTier) {
            logger.info("Active schedule found without mapped upgrade tier", {
              team_id: teamId,
              subscription_id: subscription.id,
              schedule_id: activeSchedule.id,
              activeSchedule,
            });

            continue;
          }

          if (usage > scheduledTier.posts) {
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

            await maybeTriggerUsageNotification({
              teamId,
              notificationType: "usage_alert",
              periodStart: usageWindow.start_at,
              periodEnd: usageWindow.end_at,
              message: `Usage exceeded current and previous plan limits (${usage}/${currentLimit} posts used this period).`,
              metadata: buildUsageEmailMetadata({
                teamId,
                teamName,
                usage,
                currentLimit,
                currentPlanPostLimit: planInfo.postLimit,
                currentPlanName: planInfo.planName,
                suggestedTier: nextScheduledTier,
                periodStart: usageWindow.start_at,
                transactionalEmailId: LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID,
                notificationTemplate: "usage_limit_upgrade",
              }),
              checkForDuplicates: false,
            });

            logger.info("Replaced scheduled upgrade with next tier", {
              team_id: teamId,
              subscription_id: subscription.id,
              previous_scheduled_tier: scheduledTier.productId,
              next_scheduled_tier: nextScheduledTier.productId,
            });

            await trackUpgradeScheduled({
              teamId,
              stripeCustomerId,
              subscription,
              fromProductId: planInfo.productId,
              toTier: nextScheduledTier,
              previousScheduledProductId: scheduledTier.productId,
              usage,
              currentLimit,
            });

            continue;
          }

          logger.info("Team has not exceeded next tier usage", {
            team_id: teamId,
            subscription_id: subscription.id,
            scheduled_tier: scheduledTier.productId,
            usage: usage,
          });
        } catch (teamError) {
          logger.error("Error processing team usage limits", {
            team_id: teamId,
            error: teamError,
          });
        }
      }

      for (const usageWindow of activeUsageWindows) {
        const {
          team_id: teamId,
          count: usage,
          limit: currentLimit,
          stripe_customer_id: stripeCustomerId,
          team_name: teamName,
          start_at: periodStart,
          end_at: periodEnd,
        } = usageWindow;

        try {
          if (currentLimit <= 0) {
            continue;
          }

          const percentage = (usage / currentLimit) * 100;
          const crossedThreshold = getCrossedUsageThreshold(percentage);

          if (!crossedThreshold) {
            continue;
          }

          if (!LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID) {
            logger.info(
              "Usage threshold crossed but no Loops template configured",
              {
                team_id: teamId,
                threshold_percent: crossedThreshold.percent,
              },
            );
            continue;
          }

          // Cheap dedup check first — including the floor against any
          // higher threshold already notified this period — before the
          // Stripe eligibility lookup below, so teams that stay above a
          // threshold for the rest of the billing period don't cost a
          // live Stripe API call on every 5-minute tick.
          const alreadyNotified = await hasHigherOrEqualUsageNotification(
            teamId,
            crossedThreshold,
            periodStart,
            periodEnd,
          );

          if (alreadyNotified) {
            logger.info(
              "Usage notification already sent for period at this or a higher threshold",
              {
                team_id: teamId,
                notification_type: crossedThreshold.notificationType,
                period_start: periodStart,
                period_end: periodEnd,
              },
            );
            continue;
          }

          const eligiblePlan = await getEligibleSubscriptionPlan({
            teamId,
            stripeCustomerId,
          });

          if (!eligiblePlan) {
            continue;
          }

          const { planInfo, nextTier } = eligiblePlan;

          await maybeTriggerUsageNotification({
            teamId,
            notificationType: crossedThreshold.notificationType,
            periodStart,
            periodEnd,
            message: `Usage at ${Math.round(percentage)}% of plan limit (${usage}/${currentLimit} posts used this period).`,
            metadata: buildUsageEmailMetadata({
              teamId,
              teamName,
              usage,
              currentLimit,
              currentPlanPostLimit: planInfo.postLimit,
              currentPlanName: planInfo.planName,
              suggestedTier: nextTier,
              periodStart,
              transactionalEmailId: LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID,
              notificationTemplate: crossedThreshold.notificationTemplate,
              thresholdPercent: crossedThreshold.percent,
            }),
            checkForDuplicates: false,
          });
        } catch (teamError) {
          logger.error("Error processing team usage threshold warning", {
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
