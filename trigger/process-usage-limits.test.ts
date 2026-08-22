import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type Stripe from "stripe";

// `triggerTeamNotification` calls `tasks.trigger("process-team-notification", ...)`,
// which would otherwise attempt a live trigger.dev API call outside of a real
// run context. Intercept just `tasks.trigger` and record calls so the
// exceeded-usage-window flow can be exercised end-to-end without a live
// trigger.dev connection or a `process-team-notification` implementation.
const taskTriggerCalls: {
  id: string;
  payload: Record<string, unknown>;
}[] = [];

mock.module("@trigger.dev/sdk", () => {
  // `require` (not `import`) is required here: an async `import()` inside
  // this factory re-enters bun's mock resolution for the same specifier and
  // deadlocks, whereas a synchronous `require()` resolves to the real module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual: typeof import("@trigger.dev/sdk") = require("@trigger.dev/sdk");
  return {
    ...actual,
    tasks: {
      ...actual.tasks,
      trigger: mock(async (id: string, payload: Record<string, unknown>) => {
        taskTriggerCalls.push({ id, payload });
        return { id: "run_1" };
      }),
    },
  };
});

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

describe("processExceededUsageWindow (PFM-1061 single-email flow)", () => {
  const makeUsageWindow = (overrides: Record<string, unknown> = {}) => ({
    team_id: "team_1",
    count: 1200,
    limit: 1000,
    start_at: "2026-02-01T00:00:00Z",
    end_at: "2026-03-01T00:00:00Z",
    team_name: "Team One",
    stripe_customer_id: "cus_1",
    ...overrides,
  });

  // Routes `supabaseClient.from(table)` per-table so a single fake can back
  // both `hasExceededPreviouseLimit` (`social_post_team_usage`) and
  // `hasUsageNotificationForPeriod` (`team_notifications`) within one call to
  // `processExceededUsageWindow`. `trackUpgradeScheduled`'s `teams` lookup is
  // stubbed to "not found" so it no-ops rather than needing its own fixture.
  const fakeSupabaseFrom =
    ({
      previousWindow = null,
      alreadyNotified = false,
    }: {
      previousWindow?: { count: number; limit: number } | null;
      alreadyNotified?: boolean;
    }) =>
    (table: string) => {
      if (table === "social_post_team_usage") {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          lte: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: async () => ({
            data: previousWindow
              ? {
                  team_id: "team_1",
                  count: previousWindow.count,
                  limit: previousWindow.limit,
                  start_at: "2026-01-01T00:00:00Z",
                  end_at: "2026-02-01T00:00:00Z",
                }
              : null,
            error: null,
          }),
        };
        return builder;
      }

      if (table === "team_notifications") {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          gte: () => builder,
          lt: () => builder,
          limit: () => builder,
          maybeSingle: async () => ({
            data: alreadyNotified ? { id: "notif_1" } : null,
            error: null,
          }),
        };
        return builder;
      }

      // `teams` (trackUpgradeScheduled) and anything else: no row found, so
      // the caller short-circuits rather than needing a dedicated fixture.
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return builder;
    };

  const mockNoActiveSchedules = () => {
    mod.stripe.subscriptionSchedules.list = mock(async () => ({
      data: [],
    })) as any;
  };

  const mockScheduleCreation = () => {
    const create = mock(async () => ({
      id: "sched_1",
      phases: [{ start_date: 1000 }],
    })) as any;
    const update = mock(async () => ({})) as any;
    mod.stripe.subscriptionSchedules.create = create;
    mod.stripe.subscriptionSchedules.update = update;
    // scheduleUpgrade() re-lists + releases any active schedules before
    // creating the new one, independent of getActiveScheduleForSubscription's
    // own list call above.
    mod.stripe.subscriptionSchedules.release = mock(async () => ({})) as any;
    mod.stripe.products.retrieve = mock(async () => ({
      default_price: "price_next_tier",
    })) as any;
    return { create, update };
  };

  const refuseSubscriptionScheduleWrites = () => {
    mod.stripe.subscriptionSchedules.create = mock(() => {
      throw new Error("should not create a schedule");
    }) as any;
    mod.stripe.subscriptionSchedules.update = mock(() => {
      throw new Error("should not update a schedule");
    }) as any;
  };

  beforeEach(() => {
    taskTriggerCalls.length = 0;
  });

  test("first exceeded window: sends the merged notice once, creates no Stripe schedule", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      previousWindow: null, // not exceeded previously → strike 1
      alreadyNotified: false,
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
    const [{ id, payload }] = taskTriggerCalls;
    expect(id).toBe("process-team-notification");
    expect(payload.notification_type).toBe("usage_alert");
    expect((payload.meta_data as any).notification_template).toBe(
      "usage_limit_upgrade_notice",
    );
    expect((payload.meta_data as any).data.loops.transactional_id).toBe(
      "loops_upgrade",
    );
  });

  test("does not re-send when the period was already notified", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      previousWindow: null,
      alreadyNotified: true,
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("second consecutive exceeded window: creates the Stripe schedule with no additional email", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      previousWindow: { count: 1100, limit: 1000 }, // exceeded previous period too → strike 2
      alreadyNotified: false, // this (new) period hasn't been notified yet
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(create).toHaveBeenCalledTimes(1);
    // Exactly one email for this window — the strike-1-style notice above,
    // not a second one from schedule creation.
    expect(taskTriggerCalls.length).toBe(1);
    expect(
      (taskTriggerCalls[0].payload.meta_data as any).notification_template,
    ).toBe("usage_limit_upgrade_notice");
  });

  test("escalation: usage exceeds the scheduled tier, schedule is bumped, and a follow-up notice fires", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      previousWindow: { count: 1100, limit: 1000 },
      alreadyNotified: false,
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    // An active schedule already exists, mapped to the tier_2_5k phase
    // (2,500 posts) — usage below will exceed that, forcing an escalation.
    mod.stripe.subscriptionSchedules.list = mock(async () => ({
      data: [
        {
          id: "sched_existing",
          status: "active",
          subscription: "sub_1",
          phases: [
            {
              start_date: 1893456000,
              items: [{ price: "price_tier_2_5k" }],
            },
          ],
        },
      ],
    })) as any;
    mod.stripe.prices.retrieve = mock(async () => ({
      product: "tier_2_5k",
    })) as any;
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(
      makeUsageWindow({
        count: 3000, // exceeds the scheduled tier_2_5k's 2,500-post limit
        limit: 1000,
      }) as any,
    );

    expect(create).toHaveBeenCalledTimes(1); // re-scheduled to tier_5k
    expect(taskTriggerCalls.length).toBe(2); // strike-1-style notice + escalation notice
    const escalationPayload = taskTriggerCalls[1].payload;
    expect((escalationPayload.meta_data as any).notification_template).toBe(
      "usage_limit_upgrade_notice",
    );
    expect(
      (escalationPayload.meta_data as any).tracking.suggested_plan_post_limit,
    ).toBe(5000); // tier_5k
  });
});
