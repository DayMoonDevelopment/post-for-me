import { beforeAll, describe, expect, mock, test } from "bun:test";
import type Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-dummy";
process.env.STRIPE_PRICING_TIER_1K_PRODUCT_ID = "tier_1k";
process.env.STRIPE_PRICING_TIER_2_5K_PRODUCT_ID = "tier_2_5k";
process.env.STRIPE_PRICING_TIER_5K_PRODUCT_ID = "tier_5k";
process.env.STRIPE_PRICING_TIER_10K_PRODUCT_ID = "tier_10k";
process.env.STRIPE_PRICING_TIER_20K_PRODUCT_ID = "tier_20k";
process.env.STRIPE_PRICING_TIER_40K_PRODUCT_ID = "tier_40k";
process.env.STRIPE_PRICING_TIER_100K_PRODUCT_ID = "tier_100k";
process.env.STRIPE_PRICING_TIER_200K_PRODUCT_ID = "tier_200k";
process.env.STRIPE_API_PRODUCT_ID = "tier_legacy";
process.env.LOOPS_USAGE_LIMIT_TRANSACTIONAL_EMAIL_ID = "loops_limit";
process.env.LOOPS_USAGE_UPGRADE_TRANSACTIONAL_EMAIL_ID = "loops_upgrade";
process.env.LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID = "loops_threshold";

let mod: typeof import("./process-usage-limits");

beforeAll(async () => {
  mod = await import("./process-usage-limits");
});

const makeSubscription = (
  overrides: Partial<Stripe.Subscription> = {},
): Stripe.Subscription =>
  ({
    id: "sub_1",
    cancel_at_period_end: false,
    cancel_at: null,
    cancellation_details: null,
    items: {
      data: [
        {
          price: { product: "tier_1k" },
          current_period_end: 1893456000,
        },
      ],
    },
    ...overrides,
  }) as unknown as Stripe.Subscription;

// Fake Supabase query builder for the `team_notifications` chain used by
// hasUsageNotificationForPeriod: reports "already sent" for whichever
// notification_type values are in `notifiedTypes`.
const fakeNotificationsFrom = (notifiedTypes: Set<string>) => () => {
  let queriedType: string | undefined;
  const builder: any = {
    select: () => builder,
    eq: (column: string, value: string) => {
      if (column === "notification_type") {
        queriedType = value;
      }
      return builder;
    },
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({
      data:
        queriedType && notifiedTypes.has(queriedType)
          ? { id: "notif_1" }
          : null,
      error: null,
    }),
  };
  return builder;
};

describe("getCrossedUsageThreshold", () => {
  test("returns null below the lowest threshold", () => {
    expect(mod.getCrossedUsageThreshold(50)).toBeNull();
  });

  test("returns the 80% threshold between 80 and 90", () => {
    expect(mod.getCrossedUsageThreshold(85)?.percent).toBe(80);
  });

  test("returns the highest threshold crossed, not the first in the array", () => {
    // Regression test: USAGE_WARNING_THRESHOLDS is declared highest-first,
    // but getCrossedUsageThreshold must not depend on that ordering to pick
    // the highest match.
    expect(mod.getCrossedUsageThreshold(96)?.percent).toBe(95);
    expect(mod.getCrossedUsageThreshold(91)?.percent).toBe(90);
    expect(mod.getCrossedUsageThreshold(80)?.percent).toBe(80);
  });
});

describe("hasScheduledCancellation", () => {
  test("false when nothing indicates cancellation", () => {
    expect(mod.hasScheduledCancellation(makeSubscription())).toBe(false);
  });

  test("true when cancel_at_period_end is set", () => {
    expect(
      mod.hasScheduledCancellation(
        makeSubscription({ cancel_at_period_end: true }),
      ),
    ).toBe(true);
  });

  test("true when cancel_at is set", () => {
    expect(
      mod.hasScheduledCancellation(
        makeSubscription({ cancel_at: 1893456000 }),
      ),
    ).toBe(true);
  });
});

describe("getSubscriptionPlanInfo", () => {
  test("identifies a new-pricing tier by product id", () => {
    const planInfo = mod.getSubscriptionPlanInfo(makeSubscription());
    expect(planInfo.isLegacy).toBe(false);
    expect(planInfo.postLimit).toBe(1000);
    expect(planInfo.productId).toBe("tier_1k");
  });

  test("identifies the legacy plan by product id", () => {
    const planInfo = mod.getSubscriptionPlanInfo(
      makeSubscription({
        items: {
          data: [{ price: { product: "tier_legacy" }, current_period_end: 0 }],
        } as any,
      }),
    );
    expect(planInfo.isLegacy).toBe(true);
    expect(planInfo.postLimit).toBeNull();
  });

  test("returns all-null info for an unrecognized product", () => {
    const planInfo = mod.getSubscriptionPlanInfo(
      makeSubscription({
        items: {
          data: [{ price: { product: "unknown" }, current_period_end: 0 }],
        } as any,
      }),
    );
    expect(planInfo.isLegacy).toBe(false);
    expect(planInfo.postLimit).toBeNull();
  });
});

describe("getEligibleSubscriptionPlan", () => {
  test("returns null and skips Stripe entirely when there is no customer id", async () => {
    mod.stripe.subscriptions.list = mock(() => {
      throw new Error("should not be called");
    }) as any;

    const result = await mod.getEligibleSubscriptionPlan({
      teamId: "team_1",
      stripeCustomerId: null,
    });

    expect(result).toBeNull();
  });

  test("returns null when the team has no active subscription", async () => {
    mod.stripe.subscriptions.list = mock(async () => ({ data: [] })) as any;

    const result = await mod.getEligibleSubscriptionPlan({
      teamId: "team_1",
      stripeCustomerId: "cus_1",
    });

    expect(result).toBeNull();
  });

  test("returns null for a legacy plan", async () => {
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [
        makeSubscription({
          items: {
            data: [
              { price: { product: "tier_legacy" }, current_period_end: 0 },
            ],
          } as any,
        }),
      ],
    })) as any;

    const result = await mod.getEligibleSubscriptionPlan({
      teamId: "team_1",
      stripeCustomerId: "cus_1",
    });

    expect(result).toBeNull();
  });

  test("returns null for a subscription with a scheduled cancellation", async () => {
    // Regression test: this eligibility gate must apply identically to the
    // exceeded-usage (100%) email path and the active-usage threshold
    // warning path — previously only the warning path checked it.
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription({ cancel_at_period_end: true })],
    })) as any;

    const result = await mod.getEligibleSubscriptionPlan({
      teamId: "team_1",
      stripeCustomerId: "cus_1",
    });

    expect(result).toBeNull();
  });

  test("returns the plan and next tier for an eligible subscription", async () => {
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    const result = await mod.getEligibleSubscriptionPlan({
      teamId: "team_1",
      stripeCustomerId: "cus_1",
    });

    expect(result?.planInfo.productId).toBe("tier_1k");
    expect(result?.nextTier?.productId).toBe("tier_2_5k");
  });
});

describe("hasHigherOrEqualUsageNotification", () => {
  test("returns true when a higher threshold already fired this period", async () => {
    // Regression test: a team warned at 95% must not later receive an 80%
    // warning after usage is recalculated downward mid-period.
    mod.supabaseClient.from = fakeNotificationsFrom(
      new Set(["usage_alert_95"]),
    ) as any;

    const eightyThreshold = mod.USAGE_WARNING_THRESHOLDS.find(
      (t) => t.percent === 80,
    )!;

    const result = await mod.hasHigherOrEqualUsageNotification(
      "team_1",
      eightyThreshold,
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
    );

    expect(result).toBe(true);
  });

  test("returns false when only a lower threshold has fired", async () => {
    mod.supabaseClient.from = fakeNotificationsFrom(
      new Set(["usage_alert_80"]),
    ) as any;

    const ninetyFiveThreshold = mod.USAGE_WARNING_THRESHOLDS.find(
      (t) => t.percent === 95,
    )!;

    const result = await mod.hasHigherOrEqualUsageNotification(
      "team_1",
      ninetyFiveThreshold,
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
    );

    expect(result).toBe(false);
  });

  test("returns false when nothing has fired this period", async () => {
    mod.supabaseClient.from = fakeNotificationsFrom(new Set()) as any;

    const eightyThreshold = mod.USAGE_WARNING_THRESHOLDS.find(
      (t) => t.percent === 80,
    )!;

    const result = await mod.hasHigherOrEqualUsageNotification(
      "team_1",
      eightyThreshold,
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
    );

    expect(result).toBe(false);
  });
});
