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

// A raw `team_notifications` row fixture as stored by the two email flows:
// the communication bucket is the row's own notification_type
// ('usage_alert' = threshold warning, 'usage_limit_upgrade_notice' = the
// upgrade notice), with optional `threshold` context and delivery `results`
// in meta_data. A 'usage_alert' row without a threshold models a row written
// by the pre-split system (the old usage_limit_alert/usage_limit_upgrade
// flow, which shared 'usage_alert').
const alertRow = ({
  type,
  threshold,
  statuses = [],
}: {
  type: "usage_alert" | "usage_limit_upgrade_notice";
  threshold?: number;
  statuses?: string[];
}) => ({
  notification_type: type,
  meta_data: {
    ...(threshold !== undefined ? { threshold } : {}),
    results: statuses.map((status) => ({ status })),
  },
});

// Fake Supabase query builder for the single `team_notifications` chain used
// by getUsageAlertsForPeriod (select → in → eq → gte → lt, resolving the
// `{ data, error }` shape at the terminal `lt()`). `teams`
// (trackUpgradeScheduled) and anything else resolves "no row found" so those
// callers short-circuit rather than needing their own fixture.
//
// `teamNotificationsQueryCount` (reset in `beforeEach`) counts every
// `.from("team_notifications")` call so a regression reintroducing a
// redundant duplicate dedup query is caught even though it wouldn't change
// any send/defer assertion.
let teamNotificationsQueryCount = 0;

const fakeSupabaseFrom =
  (alertRows: ReturnType<typeof alertRow>[] = []) =>
  (table: string) => {
    if (table === "team_notifications") {
      teamNotificationsQueryCount += 1;
      const builder: any = {
        select: () => builder,
        in: () => builder,
        eq: () => builder,
        gte: () => builder,
        lt: () => ({ data: alertRows, error: null }),
      };
      return builder;
    }

    const builder: any = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return builder;
  };

describe("getCrossedUsageThreshold", () => {
  test("returns null below the lowest threshold", () => {
    expect(mod.getCrossedUsageThreshold(50)).toBeNull();
  });

  test("returns the 80% threshold between 80 and 90", () => {
    expect(mod.getCrossedUsageThreshold(85)).toBe(80);
  });

  test("warnings fire AT the threshold, not only after it", () => {
    expect(mod.getCrossedUsageThreshold(80)).toBe(80);
    expect(mod.getCrossedUsageThreshold(95)).toBe(95);
  });

  test("returns the highest threshold crossed, not the first in the array", () => {
    // Regression test: USAGE_WARNING_THRESHOLDS is declared highest-first,
    // but getCrossedUsageThreshold must not depend on that ordering to pick
    // the highest match.
    expect(mod.getCrossedUsageThreshold(96)).toBe(95);
    expect(mod.getCrossedUsageThreshold(91)).toBe(90);
  });
});

describe("bucketUsageWindows", () => {
  const window = (count: number, limit: number) =>
    ({
      team_id: "team_1",
      count,
      limit,
      start_at: "2026-02-01T00:00:00Z",
      end_at: "2026-03-01T00:00:00Z",
      team_name: "Team One",
      stripe_customer_id: "cus_1",
    }) as any;

  test("strictly over the limit lands in the upgrade bucket", () => {
    const { overLimitWindows, warningWindows } = mod.bucketUsageWindows([
      window(1001, 1000),
    ]);
    expect(overLimitWindows.length).toBe(1);
    expect(warningWindows.length).toBe(0);
  });

  test("exactly at the limit is a warning, not an upgrade", () => {
    // Business rule: there is no "at 100%" email — the upgrade notice fires
    // only strictly AFTER the limit, so a team at exactly 100% gets the 95%
    // warning instead.
    const { overLimitWindows, warningWindows } = mod.bucketUsageWindows([
      window(1000, 1000),
    ]);
    expect(overLimitWindows.length).toBe(0);
    expect(warningWindows.length).toBe(1);
  });

  test("under the limit is a warning candidate", () => {
    const { overLimitWindows, warningWindows } = mod.bucketUsageWindows([
      window(850, 1000),
    ]);
    expect(overLimitWindows.length).toBe(0);
    expect(warningWindows.length).toBe(1);
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
    // over-limit email path and the threshold warning path — previously only
    // the warning path checked it.
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

describe("usage alert records and dedup", () => {
  test("getUsageAlertsForPeriod parses type, threshold, and delivery", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_alert",
        threshold: 80,
        statuses: ["sent"],
      }),
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["failed"],
      }),
    ]) as any;

    const alerts = await mod.getUsageAlertsForPeriod(
      "team_1",
      "2026-02-01T00:00:00Z",
      "2026-03-01T00:00:00Z",
    );

    expect(alerts).toEqual([
      {
        type: "usage_alert",
        threshold: 80,
        delivered: true,
      },
      {
        type: "usage_limit_upgrade_notice",
        threshold: null,
        delivered: false,
      },
    ]);
  });

  test("a legacy usage_alert row without a threshold counts as the upgrade notice", async () => {
    // Deploy-transition rule: rows written by the old
    // usage_limit_alert/usage_limit_upgrade flow used 'usage_alert' with no
    // threshold metadata — they must suppress a notice re-send, not read as
    // a threshold warning. New warnings always stamp their threshold.
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({ type: "usage_alert", statuses: ["sent"] }),
    ]) as any;

    const alerts = await mod.getUsageAlertsForPeriod(
      "team_1",
      "2026-02-01T00:00:00Z",
      "2026-03-01T00:00:00Z",
    );

    expect(mod.hasDeliveredUpgradeNotice(alerts)).toBe(true);
  });

  test("a delivered threshold warning is not an upgrade notice", () => {
    expect(
      mod.hasDeliveredUpgradeNotice([
        { type: "usage_alert", threshold: 95, delivered: true },
      ]),
    ).toBe(false);
  });

  test("an undelivered upgrade notice does not count as notified", () => {
    expect(
      mod.hasDeliveredUpgradeNotice([
        { type: "usage_limit_upgrade_notice", threshold: null, delivered: false },
      ]),
    ).toBe(false);
  });

  test("a higher delivered warning floors a lower one", () => {
    // Regression test: a team warned at 95% must not later receive an 80%
    // warning after usage is recalculated downward mid-period.
    const alerts = [{ type: "usage_alert", threshold: 95, delivered: true }];
    expect(mod.hasDeliveredWarningAtOrAbove(alerts as any, 80)).toBe(true);
  });

  test("a lower delivered warning does not block a higher one", () => {
    const alerts = [{ type: "usage_alert", threshold: 80, delivered: true }];
    expect(mod.hasDeliveredWarningAtOrAbove(alerts as any, 95)).toBe(false);
  });

  test("a delivered upgrade notice floors every warning", () => {
    // A team already told "you will be upgraded" must not get an 80% warning
    // after a mid-period limit raise drops them back under a threshold.
    const alerts = [
      { type: "usage_limit_upgrade_notice", threshold: null, delivered: true },
    ];
    expect(mod.hasDeliveredWarningAtOrAbove(alerts as any, 80)).toBe(true);
    expect(mod.hasDeliveredWarningAtOrAbove(alerts as any, 95)).toBe(true);
  });

  test("nothing delivered means nothing is floored", () => {
    expect(mod.hasDeliveredWarningAtOrAbove([], 80)).toBe(false);
    expect(
      mod.hasDeliveredWarningAtOrAbove(
        [{ type: "usage_alert", threshold: 95, delivered: false }] as any,
        80,
      ),
    ).toBe(false);
  });
});

describe("processExceededUsageWindow (single-strike upgrade flow)", () => {
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
    // No prior exceeded period is modeled anywhere — a single crossing is
    // enough to promise the upgrade (no two-strike gate). The schedule
    // itself still waits for confirmed delivery.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
    const [{ id, payload }] = taskTriggerCalls;
    expect(id).toBe("process-team-notification");
    // Distinct notification type: an action (the upgrade) is being taken on
    // the team's behalf, unlike the informational usage_alert warnings.
    expect(payload.notification_type).toBe("usage_limit_upgrade_notice");
    expect(payload.message).toContain("You will be upgraded to the next tier.");
    const metadata = payload.meta_data as any;
    // The notice fires strictly after 100%, not at a warning threshold — it
    // carries no `threshold`; the audit trail is the type + tracking.
    expect(metadata.threshold).toBeUndefined();
    expect(metadata.tracking.usage_count).toBe(1200);
    expect(metadata.tracking.current_limit).toBe(1000);
    expect(metadata.data.loops.transactional_id).toBe("loops_upgrade");
    // Regression guard: the send-decision, defer-decision, and
    // promised-upgrade check must share a single `team_notifications` query.
    expect(teamNotificationsQueryCount).toBe(1);
  });

  test("does not re-send when the period's notice was already confirmed delivered", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["sent"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    mockScheduleCreation();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("a delivered threshold warning does not satisfy the upgrade-notice dedup", async () => {
    // Separation of concerns: a delivered 95% warning (usage_alert, with a
    // threshold stamped) is informational only — it must not suppress the
    // "you will be upgraded" notice once the limit is actually exceeded.
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_alert",
        threshold: 95,
        statuses: ["sent"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
    expect(taskTriggerCalls[0].payload.notification_type).toBe(
      "usage_limit_upgrade_notice",
    );
  });

  test("retries the notice when the prior attempt for this period failed to deliver", async () => {
    // A `team_notifications` row exists for this period, but its only
    // delivery result is "failed" — row existence alone must not count as
    // "notified", or a team whose only send attempt fails would never be
    // retried yet could still be auto-upgraded later.
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["failed"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
  });

  test("first-ever exceeded window, notice already confirmed delivered: creates the Stripe schedule with no additional email", async () => {
    // Core single-strike regression test: no prior exceeded period at all,
    // yet a single confirmed-delivered crossing is enough to create the
    // schedule — the old two-strike gate required this to be the *second*
    // consecutive exceeded period before scheduling anything.
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["sent"], // confirmed delivered on an earlier tick
      }),
    ]) as any;
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
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["sent"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({ data: [] })) as any;

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("never-eligible team crossing 100%: no notification, since no upgrade was ever promised", async () => {
    // The team was ineligible from the start this period (e.g. no active
    // Stripe subscription) — nothing was promised, so nothing fires or logs.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
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
    mod.supabaseClient.from = fakeSupabaseFrom([
      // An active schedule can only exist if the current period's notice
      // was already confirmed delivered (the delivery-confirmation gate).
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["sent"],
      }),
    ]) as any;
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
    expect(escalationPayload.notification_type).toBe(
      "usage_limit_upgrade_notice",
    );
    expect(
      (escalationPayload.meta_data as any).tracking.suggested_plan_post_limit,
    ).toBe(5000); // tier_5k
  });

  test("escalation: a burst that skips multiple tiers converges to the correct tier in one step", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_limit_upgrade_notice",
        statuses: ["sent"],
      }),
    ]) as any;
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
