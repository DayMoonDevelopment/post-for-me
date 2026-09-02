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
const LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID =
  process.env?.LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID || "";
// One shared template for all three thresholds — the crossed percent is sent
// as `threshold_percent`/`usage_percent` in the Loops data payload, so the
// template branches copy/subject on that instead of needing a template per
// tier.
const LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID =
  process.env?.LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID || "";

type TeamUsageWindow =
  Database["public"]["Functions"]["get_team_usage_windows_over_threshold"]["Returns"][number];
type TeamNotificationType =
  Database["public"]["Tables"]["team_notifications"]["Row"]["notification_type"];

// The two usage communications are distinct concerns at the
// notification_type level, even though one cron processes both (a
// Trigger-cost convenience, not a statement that they're one entity):
// - "usage_alert": informational 80/90/95% threshold warning. No action is
//   required or taken; the crossed threshold rides along in meta_data as
//   read-only context ("the 80% warning fired at 802 of a 1000-post limit"
//   — threshold + tracking.usage_count + tracking.current_limit).
// - "usage_limit_upgrade_notice": the team exceeded their plan's post limit
//   and an upgrade was automatically scheduled on their behalf — a billing
//   impact, so it gets its own type, not a metadata variant.
const USAGE_ALERT_TYPE = "usage_alert" satisfies TeamNotificationType;
const UPGRADE_NOTICE_TYPE =
  "usage_limit_upgrade_notice" satisfies TeamNotificationType;

// Warning thresholds, in percent. The DB just returns every in-window team
// at/over the lowest of these (get_team_usage_windows_over_threshold);
// bucketing is pure JS business logic, so changing thresholds needs no
// migration. Warnings fire AT or after each threshold; the upgrade notice
// fires only strictly AFTER 100% — there is no "at 100%" email, a team
// sitting exactly at its limit gets the 95% warning.
export const USAGE_WARNING_THRESHOLDS = [95, 90, 80] as const;

// Returns the highest threshold crossed (>=), or null below all of them.
// Does not depend on array order, so appending a new threshold can't
// silently change which one wins.
export const getCrossedUsageThreshold = (percentage: number): number | null =>
  USAGE_WARNING_THRESHOLDS.filter((threshold) => percentage >= threshold).reduce<
    number | null
  >(
    (highest, candidate) =>
      highest === null || candidate > highest ? candidate : highest,
    null,
  );

const triggerTeamNotification = async (
  teamId: string,
  notificationType: TeamNotificationType,
  message: string,
  metadata: Json,
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

// Keep in sync with dashboard/app/lib/.server/stripe.constants.ts — same env
// vars, same shape, same filter.
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
].filter((tier) => tier.productId); // Filter out tiers without product IDs

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
  const nextTier = getNextTier(planInfo.productId, PRICING_TIERS);

  return {
    subscription,
    planInfo,
    currentPlanItem,
    currentPeriodEnd,
    nextTier,
  };
};

const getUsageWindowsOverThreshold = async (
  thresholdPercent: number,
): Promise<TeamUsageWindow[]> => {
  const { data, error } = await supabaseClient.rpc(
    "get_team_usage_windows_over_threshold",
    { threshold_percent: thresholdPercent },
  );

  if (error) {
    throw error;
  }

  return data ?? [];
};

// Splits one fetched batch into the two business buckets: strictly over the
// limit (upgrade-notice + scheduling flow) vs at-or-under it (80/90/95%
// warnings). A team at exactly 100% is a warning, not an upgrade — the
// upgrade notice only fires once the limit is actually exceeded.
export const bucketUsageWindows = (
  windows: TeamUsageWindow[],
): {
  overLimitWindows: TeamUsageWindow[];
  warningWindows: TeamUsageWindow[];
} => ({
  overLimitWindows: windows.filter((window) => window.count > window.limit),
  warningWindows: windows.filter((window) => window.count <= window.limit),
});

type NotificationDeliveryResult = { status?: string };
type UsageAlertRowMetadata = {
  threshold?: number;
  results?: NotificationDeliveryResult[];
};

export type UsageAlertRecord = {
  type: TeamNotificationType;
  threshold: number | null;
  // At least one delivery attempt actually succeeded — a row that only
  // recorded "skipped"/"failed" deliveries doesn't count, so a failed send
  // is retried on the next cron tick instead of being silently treated as
  // done forever.
  delivered: boolean;
};

// A usage_alert row without a threshold predates the per-threshold warnings
// — the old usage_limit_alert/usage_limit_upgrade flow wrote its 100%-flow
// emails under 'usage_alert'. Classify those as the upgrade notice so teams
// mid-period at deploy time aren't re-emailed; every new warning always
// stamps its threshold.
const isUpgradeNoticeRecord = (alert: UsageAlertRecord): boolean =>
  alert.type === UPGRADE_NOTICE_TYPE ||
  (alert.type === USAGE_ALERT_TYPE && alert.threshold === null);

// One query per team per tick: every usage-related notification row for the
// period, parsed into plain records. Every dedup decision is made in JS off
// this list.
export const getUsageAlertsForPeriod = async (
  teamId: string,
  periodStart: string,
  periodEnd: string,
): Promise<UsageAlertRecord[]> => {
  const { data, error } = await supabaseClient
    .from("team_notifications")
    .select("notification_type, meta_data")
    .in("notification_type", [USAGE_ALERT_TYPE, UPGRADE_NOTICE_TYPE])
    .eq("team_id", teamId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const meta = row.meta_data as UsageAlertRowMetadata | null;
    return {
      type: row.notification_type,
      threshold: typeof meta?.threshold === "number" ? meta.threshold : null,
      delivered:
        Array.isArray(meta?.results) &&
        meta.results.some((result) => result.status === "sent"),
    };
  });
};

export const hasDeliveredUpgradeNotice = (
  alerts: UsageAlertRecord[],
): boolean =>
  alerts.some((alert) => isUpgradeNoticeRecord(alert) && alert.delivered);

/**
 * True if the team was already notified this period at `threshold` or any
 * higher threshold — a delivered upgrade notice counts as higher than every
 * warning. Prevents a later downward usage recalculation (e.g. a
 * Stripe-derived backfill, or a mid-period limit raise) from firing a
 * lower-severity warning after a higher one has already gone out.
 */
export const hasDeliveredWarningAtOrAbove = (
  alerts: UsageAlertRecord[],
  threshold: number,
): boolean =>
  alerts.some(
    (alert) =>
      alert.delivered &&
      (isUpgradeNoticeRecord(alert) || (alert.threshold ?? 0) >= threshold),
  );

const maybeTriggerUsageNotification = async ({
  teamId,
  notificationType,
  periodStart,
  periodEnd,
  message,
  metadata,
}: {
  teamId: string;
  notificationType: TeamNotificationType;
  periodStart: string;
  periodEnd: string;
  message: string;
  metadata: Json;
}): Promise<void> => {
  logger.info("Triggering usage notification", {
    team_id: teamId,
    notification_type: notificationType,
    period_start: periodStart,
    period_end: periodEnd,
  });
  await triggerTeamNotification(teamId, notificationType, message, metadata);
};

// Resolves "the next tier" by sorted post-count rather than array index, so
// a tier missing its env var (dropped by the .filter above) can never cause
// this to land on the wrong tier or desync from the dashboard's copy.
const getNextTier = (
  currentProductId: string | null,
  tiers: typeof PRICING_TIERS,
): (typeof PRICING_TIERS)[number] | null => {
  if (!currentProductId) {
    return null;
  }

  const sorted = [...tiers].sort((a, b) => a.posts - b.posts);
  const currentIndex = sorted.findIndex(
    (tier) => tier.productId === currentProductId,
  );

  if (currentIndex === -1) {
    return null;
  }

  return sorted[currentIndex + 1] ?? null;
};

const SCHEDULE_METADATA_KEY = "schedule_type";
// Keep in sync with dashboard/app/lib/.server/subscription-schedules.ts —
// same key/values, so schedules created by either sibling stay mutually
// recognizable even though there's no shared package between them.
const SCHEDULE_TYPE = {
  USAGE_BASED_UPGRADE: "usage_based_upgrade",
  ADDON_REMOVAL: "addon_removal",
} as const;
type ScheduleType = (typeof SCHEDULE_TYPE)[keyof typeof SCHEDULE_TYPE];

type ScheduleReleaseCriteria =
  | { mode: "all" }
  | { mode: "matching"; type: ScheduleType }
  | { mode: "excluding"; type: ScheduleType };

const releaseSchedulesForCustomer = async ({
  stripeCustomerId,
  criteria,
}: {
  stripeCustomerId: string;
  criteria: ScheduleReleaseCriteria;
}): Promise<void> => {
  const activeSchedules = await stripe.subscriptionSchedules.list({
    customer: stripeCustomerId,
  });

  for (const schedule of activeSchedules.data.filter(
    (entry: Stripe.SubscriptionSchedule) => entry.status === "active",
  )) {
    const type = schedule.metadata?.[SCHEDULE_METADATA_KEY];
    const matches = criteria.mode !== "all" && type === criteria.type;
    const shouldRelease =
      criteria.mode === "all" ||
      (criteria.mode === "matching" && matches) ||
      (criteria.mode === "excluding" && !matches);

    if (shouldRelease) {
      await stripe.subscriptionSchedules.release(schedule.id);
    }
  }
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

      if (
        entry.metadata?.[SCHEDULE_METADATA_KEY] !==
        SCHEDULE_TYPE.USAGE_BASED_UPGRADE
      ) {
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

  const existingSchedules = (
    await stripe.subscriptionSchedules.list({ customer: stripeCustomerId })
  ).data.filter((entry) => entry.status === "active");

  for (const conflicting of existingSchedules.filter(
    (entry) =>
      entry.metadata?.[SCHEDULE_METADATA_KEY] !==
      SCHEDULE_TYPE.USAGE_BASED_UPGRADE,
  )) {
    logger.warn(
      "Releasing conflicting subscription schedule to proceed with usage-based upgrade",
      {
        schedule_id: conflicting.id,
        schedule_type: conflicting.metadata?.[SCHEDULE_METADATA_KEY] ?? null,
        subscription_id: subscription.id,
        stripe_customer_id: stripeCustomerId,
      },
    );
  }

  // Stripe only allows one active schedule per subscription — release
  // everything (not just prior upgrade schedules) so the create() below
  // never fails due to a leftover addon-removal schedule.
  await releaseSchedulesForCustomer({
    stripeCustomerId,
    criteria: { mode: "all" },
  });

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscription.id,
    metadata: { [SCHEDULE_METADATA_KEY]: SCHEDULE_TYPE.USAGE_BASED_UPGRADE },
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
 * Shared metadata builder for both the over-limit upgrade-notice and the
 * threshold-warning (80/90/95%) flows, so the Loops/PostHog payload shape
 * can't drift between the two email paths.
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
  thresholdPercent?: number;
}): Json => ({
  // The communication bucket lives on the row's notification_type; the
  // metadata only adds read-only context. `threshold` (warnings only) plus
  // `notification_category` and `tracking` are read by
  // process-team-notification to fire the generic `notification_sent` event
  // once Loops confirms delivery. The channel + provider are added by the
  // consumer. Kept out of `data.loops.data` so these analytics-only fields
  // aren't forwarded to Loops as email variables.
  notification_category: "transactional",
  ...(thresholdPercent !== undefined ? { threshold: thresholdPercent } : {}),
  tracking: {
    usage_count: usage,
    current_limit: currentLimit,
    plan_post_limit: currentPlanPostLimit,
    suggested_plan_post_limit: suggestedTier?.posts ?? null,
    period_start: periodStart,
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
        suggested_plan_price: suggestedTier?.price ?? null,
        billing_link: `https://app.postforme.dev/${teamId}/billing`,
        team_link: `https://app.postforme.dev/${teamId}`,
        ...(thresholdPercent !== undefined
          ? { threshold_percent: thresholdPercent }
          : {}),
      },
    },
  },
  results: [],
});

// Shared by the first "you will be upgraded" notice and the escalation
// re-notice — same notification type, same period, same metadata shape;
// only the message, suggested tier, and dedup behavior differ per call site.
const sendUpgradeNotice = ({
  teamId,
  teamName,
  usage,
  currentLimit,
  planInfo,
  usageWindow,
  suggestedTier,
  message,
}: {
  teamId: string;
  teamName: string | null;
  usage: number;
  currentLimit: number;
  planInfo: ReturnType<typeof getSubscriptionPlanInfo>;
  usageWindow: TeamUsageWindow;
  suggestedTier: (typeof PRICING_TIERS)[number] | null;
  message: string;
}): Promise<void> =>
  maybeTriggerUsageNotification({
    teamId,
    notificationType: UPGRADE_NOTICE_TYPE,
    periodStart: usageWindow.start_at,
    periodEnd: usageWindow.end_at,
    message,
    metadata: buildUsageEmailMetadata({
      teamId,
      teamName,
      usage,
      currentLimit,
      currentPlanPostLimit: planInfo.postLimit,
      currentPlanName: planInfo.planName,
      suggestedTier,
      periodStart: usageWindow.start_at,
      transactionalEmailId: LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID,
    }),
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
        ? (PRICING_TIERS.find((tier) => tier.productId === productId)?.posts ??
          null)
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

/**
 * Processes a single strictly-over-limit usage window: sends the single
 * "you will be upgraded" notice the first tick a team exceeds 100%, then
 * creates or escalates the Stripe schedule once this period's notice is
 * confirmed delivered — no waiting for a second consecutive exceeded period.
 * Extracted from the cron `run` body so it's unit-testable in isolation —
 * trigger.dev's `schedules.task()` doesn't expose `run` for direct
 * invocation outside its own runtime.
 */
export const processExceededUsageWindow = async (
  usageWindow: TeamUsageWindow,
): Promise<void> => {
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
      return;
    }

    // One dedup query for everything below: the send decision, the defer
    // decision, and the promised-upgrade check all read this same list.
    const periodAlerts = await getUsageAlertsForPeriod(
      teamId,
      usageWindow.start_at,
      usageWindow.end_at,
    );

    const eligiblePlan = await getEligibleSubscriptionPlan({
      teamId,
      stripeCustomerId,
    });

    if (!eligiblePlan) {
      // If we already promised this team an upgrade this period, eligibility
      // being lost before the deferred schedule-creation tick (e.g. the
      // customer cancels in reaction to the notice) breaks that promise.
      // No customer-facing correction is sent for this — logged for internal
      // visibility only.
      if (hasDeliveredUpgradeNotice(periodAlerts)) {
        logger.warn("Upgrade eligibility lost after promising an upgrade", {
          team_id: teamId,
        });
      }

      return;
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
      return;
    }

    // Single "you will be upgraded" notice, sent once per period the moment
    // a team exceeds 100%. Checked once up front and reused below for the
    // defer decision — nothing between the two can change the answer, since
    // delivery confirmation lands asynchronously via a separate task, not
    // synchronously within this tick.
    const currentPeriodNotified = hasDeliveredUpgradeNotice(periodAlerts);

    if (!currentPeriodNotified) {
      await sendUpgradeNotice({
        teamId,
        teamName,
        usage,
        currentLimit,
        planInfo,
        usageWindow,
        suggestedTier: nextTier,
        message: `Usage exceeded current plan limit (${usage}/${currentLimit} posts used this period). You will be upgraded to the next tier.`,
      });
    }

    // Delivery happens in a separate async task (process-team-notification),
    // so it can't be confirmed synchronously above — require a confirmed
    // send for the current period before creating/escalating the Stripe
    // schedule. This defers schedule creation by at least one cron tick
    // after a successful send, closing the gap where a team could be
    // upgraded/billed without ever receiving a working notification.
    if (!currentPeriodNotified) {
      logger.info(
        "Deferring upgrade schedule until usage notice is confirmed delivered",
        { team_id: teamId },
      );
      return;
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

      // No follow-up email here — the team was already notified above
      // when they first crossed 100%.

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

      return;
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

      return;
    }

    if (usage > scheduledTier.posts) {
      const scheduledTierIndex = PRICING_TIERS.findIndex(
        (tier) => tier.productId === scheduledTier.productId,
      );
      // Jump straight to the tier that actually covers current usage
      // instead of advancing one tier at a time — a burst that skips
      // multiple tiers in one window would otherwise take one cron tick
      // (and one near-duplicate email) per intermediate tier to catch up.
      const nextScheduledTier =
        PRICING_TIERS.slice(scheduledTierIndex + 1).find(
          (tier) => tier.posts >= usage,
        ) ?? PRICING_TIERS[PRICING_TIERS.length - 1];

      if (
        !nextScheduledTier ||
        nextScheduledTier.productId === scheduledTier.productId
      ) {
        logger.info("Scheduled upgrade already at highest pricing tier", {
          team_id: teamId,
          subscription_id: subscription.id,
          usage,
          scheduled_tier: scheduledTier,
        });
        return;
      }
      await scheduleUpgrade({
        stripeCustomerId,
        subscription,
        currentPlanItem,
        currentPeriodEnd,
        nextTier: nextScheduledTier,
      });

      await sendUpgradeNotice({
        teamId,
        teamName,
        usage,
        currentLimit,
        planInfo,
        usageWindow,
        suggestedTier: nextScheduledTier,
        message: `Usage exceeded current and previous plan limits (${usage}/${currentLimit} posts used this period).`,
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

      return;
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
};

export const processUsageLimits = schedules.task({
  cron: { pattern: "*/5 * * * *", environments: ["PRODUCTION"] },
  id: "process-usage-limits",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    try {
      logger.info("Starting usage limit processing");

      // One fetch, one snapshot: every in-window team at/over the lowest
      // warning threshold. Which bucket a team lands in (strictly over the
      // limit vs a warning) is decided here in JS, not in SQL.
      const usageWindows = await getUsageWindowsOverThreshold(
        Math.min(...USAGE_WARNING_THRESHOLDS),
      );
      const { overLimitWindows, warningWindows } =
        bucketUsageWindows(usageWindows);

      if (overLimitWindows.length === 0) {
        logger.info("No teams currently over usage limits");
      }

      for (const usageWindow of overLimitWindows) {
        await processExceededUsageWindow(usageWindow);
      }

      for (const usageWindow of warningWindows) {
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

          if (crossedThreshold === null) {
            continue;
          }

          if (!LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID) {
            logger.info(
              "Usage threshold crossed but no Loops template configured",
              {
                team_id: teamId,
                threshold: crossedThreshold,
              },
            );
            continue;
          }

          // Cheap dedup check first — including the floor against any
          // higher threshold (or a delivered upgrade notice) already sent
          // this period — before the Stripe eligibility lookup below, so
          // teams that stay above a threshold for the rest of the billing
          // period don't cost a live Stripe API call on every 5-minute tick.
          const periodAlerts = await getUsageAlertsForPeriod(
            teamId,
            periodStart,
            periodEnd,
          );

          if (hasDeliveredWarningAtOrAbove(periodAlerts, crossedThreshold)) {
            logger.info(
              "Usage notification already sent for period at this or a higher threshold",
              {
                team_id: teamId,
                threshold: crossedThreshold,
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
            notificationType: USAGE_ALERT_TYPE,
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
              transactionalEmailId:
                LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID,
              thresholdPercent: crossedThreshold,
            }),
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
