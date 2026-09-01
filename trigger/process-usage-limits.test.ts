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
// hasUsageNotificationForPeriod: reports a confirmed "sent" delivery for
// whichever notification_type values are in `notifiedTypes`. The chain's
// terminal call is `lt()` (no `.limit()`/`.maybeSingle()` — the real query
// can return multiple rows per period), so it resolves the `{ data, error }`
// shape directly.
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
    lt: () => ({
      data:
        queriedType && notifiedTypes.has(queriedType)
          ? [{ meta_data: { results: [{ status: "sent" }] } }]
          : [],
      error: null,
    }),
    lte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: null, error: null }),
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
      mod.hasScheduledCancellation(makeSubscription({ cancel_at: 1893456000 })),
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

describe("processExceededUsageWindow (PFM-1061/PFM-1062 single-strike upgrade flow)", () => {
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
  // `hasUsageNotificationForPeriod` (`team_notifications`) for
  // `processExceededUsageWindow`. `trackUpgradeScheduled`'s `teams` lookup is
  // stubbed to "not found" so it no-ops rather than needing its own fixture.
  //
  // `notificationResultStatuses` models what's already recorded for the
  // *current* period when a query has no `meta_data->>notification_template`
  // filter: `[]` means no attempt yet (or none confirmed), `["sent"]` means a
  // prior attempt was confirmed delivered, `["failed"]`/`["skipped"]` models a
  // prior attempt that didn't actually reach the team.
  //
  // `templateResultStatuses` overrides that per notification_template, for
  // tests that need a specific template's delivery state distinguished from
  // the current period's general `notificationResultStatuses` default.
  //
  // `teamNotificationsQueryCount` (reset in `beforeEach`) counts every
  // `.from("team_notifications")` call so a regression reintroducing a
  // redundant duplicate query is caught even though it wouldn't change any
  // send/defer assertion.
  let teamNotificationsQueryCount = 0;

  const fakeSupabaseFrom =
    ({
      notificationResultStatuses = [],
      templateResultStatuses = {},
    }: {
      notificationResultStatuses?: string[];
      templateResultStatuses?: Record<string, string[]>;
    } = {}) =>
    (table: string) => {
      if (table === "team_notifications") {
        teamNotificationsQueryCount += 1;
        let queriedTemplate: string | undefined;
        const builder: any = {
          select: () => builder,
          eq: (column: string, value: string) => {
            if (column === "meta_data->>notification_template") {
              queriedTemplate = value;
            }
            return builder;
          },
          gte: () => builder,
          lt: () => {
            const statuses =
              queriedTemplate && queriedTemplate in templateResultStatuses
                ? templateResultStatuses[queriedTemplate]
                : notificationResultStatuses;
            return {
              data:
                statuses.length > 0
                  ? [
                      {
                        meta_data: {
                          results: statuses.map((status) => ({ status })),
                        },
                      },
                    ]
                  : [],
              error: null,
            };
          },
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
    teamNotificationsQueryCount = 0;
  });

  test("first-ever exceeded window: sends the confident upgrade notice, defers the Stripe schedule", async () => {
    // No prior exceeded period is modeled anywhere — PFM-1062 removed the
    // two-strike gate, so a single crossing is enough to promise the
    // upgrade. The schedule itself still waits for confirmed delivery.
    mod.supabaseClient.from = fakeSupabaseFrom({
      notificationResultStatuses: [],
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
    expect(payload.message).toContain("You will be upgraded to the next tier.");
    expect((payload.meta_data as any).notification_template).toBe(
      "usage_limit_upgrade_notice",
    );
    expect((payload.meta_data as any).data.loops.transactional_id).toBe(
      "loops_upgrade",
    );
    // Regression guard: the send-decision and the defer-decision must share
    // a single `team_notifications` query, not issue it twice.
    expect(teamNotificationsQueryCount).toBe(1);
  });

  test("does not re-send when the period was already confirmed delivered", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      notificationResultStatuses: ["sent"],
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("retries the notice when the prior attempt for this period failed to deliver", async () => {
    // A `team_notifications` row exists for this period, but its only
    // delivery result is "failed" — row existence alone must not count as
    // "notified", or a team whose only send attempt fails would never be
    // retried yet could still be auto-upgraded later.
    mod.supabaseClient.from = fakeSupabaseFrom({
      notificationResultStatuses: ["failed"],
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
  });

  test("first-ever exceeded window, notice already confirmed delivered: creates the Stripe schedule with no additional email", async () => {
    // Core PFM-1062 regression test: no prior exceeded period at all, yet a
    // single confirmed-delivered crossing is enough to create the schedule —
    // the old two-strike gate required this to be the *second* consecutive
    // exceeded period before scheduling anything.
    mod.supabaseClient.from = fakeSupabaseFrom({
      notificationResultStatuses: ["sent"], // confirmed delivered on an earlier tick
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(create).toHaveBeenCalledTimes(1);
    // Already delivered for this period, so the dedup check skips re-sending.
    expect(taskTriggerCalls.length).toBe(0);
  });

  test("eligibility lost after promising an upgrade: no notification is sent", async () => {
    // The "you will be upgraded" notice was confirmed delivered on an
    // earlier tick, but this tick's eligibility check comes back ineligible
    // (e.g. the customer cancelled in reaction to the email) — this is
    // logged internally but no customer-facing email fires.
    mod.supabaseClient.from = fakeSupabaseFrom({
      templateResultStatuses: {
        usage_limit_upgrade_notice: ["sent"],
      },
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({ data: [] })) as any;

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("never-eligible team crossing 100%: no notification, since no upgrade was ever promised", async () => {
    // The team was ineligible from the start this period (e.g. no active
    // Stripe subscription) — nothing was promised, so nothing fires or logs.
    mod.supabaseClient.from = fakeSupabaseFrom({
      templateResultStatuses: {
        usage_limit_upgrade_notice: [],
      },
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({ data: [] })) as any;

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  const mockExistingScheduleAtTier25k = () => {
    // An active schedule already exists, mapped to the tier_2_5k phase
    // (2,500 posts).
    mod.stripe.subscriptionSchedules.list = mock(async () => ({
      data: [
        {
          id: "sched_existing",
          status: "active",
          subscription: "sub_1",
          metadata: { schedule_type: "usage_based_upgrade" },
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
  };

  test("escalation: usage exceeds the scheduled tier, schedule is bumped, and a follow-up notice fires", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      // An active schedule can only exist if the current period's notice
      // was already confirmed delivered (the PFM-1061 delivery-confirmation gate).
      notificationResultStatuses: ["sent"],
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockExistingScheduleAtTier25k();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(
      makeUsageWindow({
        count: 3000, // exceeds the scheduled tier_2_5k's 2,500-post limit
        limit: 1000,
      }) as any,
    );

    expect(create).toHaveBeenCalledTimes(1); // re-scheduled to tier_5k
    // The initial crossing notice is deduped (already confirmed sent above),
    // so only the escalation notice fires.
    expect(taskTriggerCalls.length).toBe(1);
    const escalationPayload = taskTriggerCalls[0].payload;
    expect((escalationPayload.meta_data as any).notification_template).toBe(
      "usage_limit_upgrade_notice",
    );
    expect(
      (escalationPayload.meta_data as any).tracking.suggested_plan_post_limit,
    ).toBe(5000); // tier_5k
  });

  test("escalation: a burst that skips multiple tiers converges to the correct tier in one step", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom({
      notificationResultStatuses: ["sent"],
    }) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockExistingScheduleAtTier25k();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(
      // 12,000 posts skips tier_5k (5,000) and tier_10k (10,000) — the
      // correct landing tier is tier_20k (20,000).
      makeUsageWindow({
        count: 12000,
        limit: 1000,
      }) as any,
    );

    // One schedule replacement and one email, landing directly on tier_20k
    // — not one per intermediate tier.
    expect(create).toHaveBeenCalledTimes(1);
    expect(taskTriggerCalls.length).toBe(1);
    expect(
      (taskTriggerCalls[0].payload.meta_data as any).tracking
        .suggested_plan_post_limit,
    ).toBe(20000); // tier_20k
  });
});
