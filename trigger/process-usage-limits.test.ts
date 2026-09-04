import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type Stripe from "stripe";

// `triggerTeamNotification` calls `tasks.trigger("process-team-notification", ...)`,
// which would otherwise attempt a live trigger.dev API call outside of a real
// run context. Intercept just `tasks.trigger` and record calls so the
// usage-window flows can be exercised end-to-end without a live trigger.dev
// connection or a `process-team-notification` implementation.
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
process.env.LOOPS_SUBSCRIPTION_ALERT_TRANSACTIONAL_EMAIL_ID = "loops_subscription_alert";
process.env.LOOPS_USAGE_THRESHOLD_TRANSACTIONAL_EMAIL_ID = "loops_threshold";
// Exercised by the escape-hatch flow tests below; team_1 (used by every
// other test) is deliberately absent so the hatch stays out of their way.
process.env.USAGE_UPGRADE_EXEMPTIONS =
  "team_exempt:2099-01-01, team_expired:2020-01-01";

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

// A raw `team_notifications` row fixture as stored by the two email paths.
// The domain is the row's notification_type; the meta_data root is sacred
// (category/tracking/data/results only), with the read-only audit context
// under tracking (threshold + current_limit for warnings,
// new_plan_post_limit for subscription updates) and the per-attempt
// delivery `results`.
const alertRow = ({
  id = "tn_existing",
  type,
  threshold,
  currentLimit,
  newPlanPostLimit,
  statuses = [],
}: {
  id?: string;
  type: "usage_alert" | "subscription_alert";
  threshold?: number;
  currentLimit?: number;
  newPlanPostLimit?: number;
  statuses?: string[];
}) => ({
  id,
  team_id: "team_1",
  project_id: null,
  notification_type: type,
  delivery_types: ["email"],
  message: "existing message",
  created_at: "2026-02-02T00:00:00Z",
  meta_data: {
    notification_category: "transactional",
    tracking: {
      ...(threshold !== undefined ? { threshold } : {}),
      ...(currentLimit !== undefined ? { current_limit: currentLimit } : {}),
      ...(newPlanPostLimit !== undefined
        ? { new_plan_post_limit: newPlanPostLimit }
        : {}),
    },
    results: statuses.map((status) => ({ status })),
  },
});

// Fake Supabase query builder for the `team_notifications` chain used by
// getUsageNotificationsForPeriod (select → eq → eq → gte → lt, resolving
// the `{ data, error }` shape at the terminal `lt()`). `teams`
// (trackUpgradeScheduled) and anything else resolves "no row found" so
// those callers short-circuit rather than needing their own fixture.
//
// `teamNotificationsQueryCount` (reset in `beforeEach`) counts every
// `.from("team_notifications")` call so a regression reintroducing a
// redundant dedup query on the action path is caught even though it
// wouldn't change any send assertion.
let teamNotificationsQueryCount = 0;

const fakeSupabaseFrom =
  (alertRows: ReturnType<typeof alertRow>[] = []) =>
  (table: string) => {
    if (table === "team_notifications") {
      teamNotificationsQueryCount += 1;
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
          data: alertRows.filter(
            (row) => row.notification_type === queriedType,
          ),
          error: null,
        }),
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

  test("warnings fire AT the threshold, not only after it", () => {
    expect(mod.getCrossedUsageThreshold(80)).toBe(80);
    expect(mod.getCrossedUsageThreshold(95)).toBe(95);
  });

  test("returns the highest threshold crossed, not the first in the array", () => {
    // Regression test: USAGE_WARNING_THRESHOLDS is declared highest-first,
    // but getCrossedUsageThreshold must not depend on that ordering to pick
    // the highest match — 96% sends only the 95 alert, never a 90/95 double.
    expect(mod.getCrossedUsageThreshold(96)).toBe(95);
    expect(mod.getCrossedUsageThreshold(91)).toBe(90);
    expect(mod.getCrossedUsageThreshold(85)).toBe(80);
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

  test("strictly over the limit lands in the subscription-update bucket", () => {
    const { overLimitWindows, warningWindows } = mod.bucketUsageWindows([
      window(1001, 1000),
    ]);
    expect(overLimitWindows.length).toBe(1);
    expect(warningWindows.length).toBe(0);
  });

  test("exactly at the limit is a warning, not a subscription update", () => {
    // Business rule: there is no "at 100%" event — the subscription changes
    // only strictly AFTER the limit, so a team at exactly 100% gets the 95%
    // warning instead.
    const { overLimitWindows, warningWindows } = mod.bucketUsageWindows([
      window(1000, 1000),
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

describe("usage notification records", () => {
  test("parseUsageNotificationRow extracts threshold, limits, and delivery", () => {
    const record = mod.parseUsageNotificationRow(
      alertRow({
        type: "usage_alert",
        threshold: 80,
        currentLimit: 1000,
        statuses: ["failed", "sent"],
      }) as any,
    );

    expect(record.threshold).toBe(80);
    expect(record.currentLimit).toBe(1000);
    expect(record.newPlanPostLimit).toBeNull();
    expect(record.delivered).toBe(true);
  });

  test("warning dedup is contextual to the current limit", () => {
    // A delivered 80% warning against the old 1k plan does NOT suppress the
    // 80% warning against a new 2.5k plan after a mid-period plan change.
    const records = [
      mod.parseUsageNotificationRow(
        alertRow({
          type: "usage_alert",
          threshold: 80,
          currentLimit: 1000,
          statuses: ["sent"],
        }) as any,
      ),
    ];

    expect(mod.hasDeliveredWarningAtOrAbove(records, 80, 1000)).toBe(true);
    expect(mod.hasDeliveredWarningAtOrAbove(records, 80, 2500)).toBe(false);
  });

  test("a higher delivered warning floors a lower one at the same limit", () => {
    const records = [
      mod.parseUsageNotificationRow(
        alertRow({
          type: "usage_alert",
          threshold: 95,
          currentLimit: 1000,
          statuses: ["sent"],
        }) as any,
      ),
    ];

    expect(mod.hasDeliveredWarningAtOrAbove(records, 80, 1000)).toBe(true);
    expect(mod.hasDeliveredWarningAtOrAbove(records, 95, 1000)).toBe(true);
  });

  test("a lower delivered warning does not block a higher one", () => {
    const records = [
      mod.parseUsageNotificationRow(
        alertRow({
          type: "usage_alert",
          threshold: 80,
          currentLimit: 1000,
          statuses: ["sent"],
        }) as any,
      ),
    ];

    expect(mod.hasDeliveredWarningAtOrAbove(records, 95, 1000)).toBe(false);
  });

  test("findRetryableWarning matches only the same threshold and limit, undelivered", () => {
    const records = [
      mod.parseUsageNotificationRow(
        alertRow({
          type: "usage_alert",
          threshold: 80,
          currentLimit: 1000,
          statuses: ["failed"],
        }) as any,
      ),
    ];

    expect(mod.findRetryableWarning(records, 80, 1000)?.row.id).toBe(
      "tn_existing",
    );
    expect(mod.findRetryableWarning(records, 90, 1000)).toBeNull();
    expect(mod.findRetryableWarning(records, 80, 2500)).toBeNull();
  });

  test("findSubscriptionAlertForPlan keys on the newly scheduled plan", () => {
    const records = [
      mod.parseUsageNotificationRow(
        alertRow({
          type: "subscription_alert",
          currentLimit: 1000,
          newPlanPostLimit: 2500,
          statuses: ["failed"],
        }) as any,
      ),
    ];

    expect(mod.findSubscriptionAlertForPlan(records, 2500).delivered).toBe(
      false,
    );
    expect(
      mod.findSubscriptionAlertForPlan(records, 2500).retryable?.row.id,
    ).toBe("tn_existing");
    // A different scheduled plan is a different update — no match.
    expect(mod.findSubscriptionAlertForPlan(records, 5000).retryable).toBeNull();
  });
});

describe("upgrade exemptions (temporary escape hatch)", () => {
  test("parses comma-separated team:date entries, tolerating whitespace", () => {
    const exemptions = mod.parseUpgradeExemptions(
      "team_a:2026-12-01, team_b:2027-01-15",
    );

    expect(exemptions.get("team_a")?.toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
    expect(exemptions.get("team_b")?.toISOString()).toBe(
      "2027-01-15T00:00:00.000Z",
    );
    expect(exemptions.has("team_c")).toBe(false);
  });

  test("an empty or unset env var exempts nobody", () => {
    expect(mod.parseUpgradeExemptions(undefined).size).toBe(0);
    expect(mod.parseUpgradeExemptions("").size).toBe(0);
  });

  test("a full ISO timestamp with offset parses under the correct team id", () => {
    // Regression test: the entry splits on the FIRST colon, so a
    // timezone-precise timestamp (which contains colons) can't mangle the
    // team id and silently drop the exemption.
    const exemptions = mod.parseUpgradeExemptions(
      "team_a:2026-12-01T00:00:00-05:00",
    );

    expect(exemptions.get("team_a")?.toISOString()).toBe(
      "2026-12-01T05:00:00.000Z",
    );
  });

  test("a malformed date fails safe: exempt indefinitely", () => {
    // Breaking the "you will not be upgraded" promise is the worse failure,
    // so a bad entry keeps the team exempt (and logs) instead of silently
    // upgrading them.
    const exemptions = mod.parseUpgradeExemptions("team_a:not-a-date,team_b");

    expect(mod.isUpgradeExempt("team_a", exemptions)).toBe(true);
    expect(mod.isUpgradeExempt("team_b", exemptions)).toBe(true);
  });

  test("exemption holds strictly before the date and expires on it", () => {
    const exemptions = mod.parseUpgradeExemptions("team_a:2026-12-01");

    expect(
      mod.isUpgradeExempt("team_a", exemptions, new Date("2026-11-30")),
    ).toBe(true);
    expect(
      mod.isUpgradeExempt("team_a", exemptions, new Date("2026-12-01")),
    ).toBe(false);
    expect(
      mod.isUpgradeExempt("team_b", exemptions, new Date("2026-11-30")),
    ).toBe(false);
  });
});

describe("processWarningWindow (usage_alert path)", () => {
  const makeUsageWindow = (overrides: Record<string, unknown> = {}) => ({
    team_id: "team_1",
    count: 820,
    limit: 1000,
    start_at: "2026-02-01T00:00:00Z",
    end_at: "2026-03-01T00:00:00Z",
    team_name: "Team One",
    stripe_customer_id: "cus_1",
    ...overrides,
  });

  beforeEach(() => {
    taskTriggerCalls.length = 0;
    teamNotificationsQueryCount = 0;
  });

  test("crossing 80% sends a usage_alert with full audit context", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    await mod.processWarningWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
    const [{ payload }] = taskTriggerCalls;
    expect(payload.notification_type).toBe("usage_alert");
    const metadata = payload.meta_data as any;
    expect(metadata.tracking.threshold).toBe(80);
    expect(metadata.tracking.usage_count).toBe(820);
    expect(metadata.tracking.current_limit).toBe(1000);
    expect(metadata.tracking.suggested_plan_post_limit).toBe(2500);
    expect(metadata.data.loops.transactional_id).toBe("loops_threshold");
  });

  test("at 96% only the 95 alert fires, never a 90/95 double", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    await mod.processWarningWindow(makeUsageWindow({ count: 960 }) as any);

    expect(taskTriggerCalls.length).toBe(1);
    expect((taskTriggerCalls[0].payload.meta_data as any).tracking.threshold).toBe(95);
  });

  test("a delivered warning at a higher threshold for the same limit suppresses re-sends without touching Stripe", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_alert",
        threshold: 95,
        currentLimit: 1000,
        statuses: ["sent"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(() => {
      throw new Error("should not hit Stripe when dedup suppresses the send");
    }) as any;

    await mod.processWarningWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("a mid-period plan change re-arms thresholds against the new limit", async () => {
    // The 80% warning was delivered against the old 1k limit; the window now
    // carries the upgraded 2.5k limit, so 80% of the NEW cap fires fresh.
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "usage_alert",
        threshold: 80,
        currentLimit: 1000,
        statuses: ["sent"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [
        makeSubscription({
          items: {
            data: [
              { price: { product: "tier_2_5k" }, current_period_end: 0 },
            ],
          } as any,
        }),
      ],
    })) as any;

    await mod.processWarningWindow(
      makeUsageWindow({ count: 2050, limit: 2500 }) as any,
    );

    expect(taskTriggerCalls.length).toBe(1);
    const metadata = taskTriggerCalls[0].payload.meta_data as any;
    expect(metadata.tracking.threshold).toBe(80);
    expect(metadata.tracking.current_limit).toBe(2500);
  });

  test("exempt team crossing a threshold: no warning email, no Stripe calls", async () => {
    // The escape hatch lifts exempt teams out of the ENTIRE usage-limits
    // system — they already received alerts under the old system.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(() => {
      throw new Error("exempt team must not hit Stripe");
    }) as any;

    await mod.processWarningWindow(
      makeUsageWindow({ team_id: "team_exempt" }) as any,
    );

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("an expired exemption no longer blocks warnings", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;

    await mod.processWarningWindow(
      makeUsageWindow({ team_id: "team_expired" }) as any,
    );

    expect(taskTriggerCalls.length).toBe(1);
    expect(taskTriggerCalls[0].payload.notification_type).toBe("usage_alert");
  });

  test("an undelivered attempt at the same warning retries on the same record", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        id: "tn_failed_attempt",
        type: "usage_alert",
        threshold: 80,
        currentLimit: 1000,
        statuses: ["failed"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(() => {
      throw new Error("retry should not need a fresh Stripe lookup");
    }) as any;

    await mod.processWarningWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(1);
    // Same record re-dispatched, not a new tn_ id.
    expect(taskTriggerCalls[0].payload.id).toBe("tn_failed_attempt");
  });
});

describe("processExceededUsageWindow (subscription_alert path)", () => {
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

  beforeEach(() => {
    taskTriggerCalls.length = 0;
    teamNotificationsQueryCount = 0;
  });

  test("first crossing: updates the subscription and sends the email in the same tick", async () => {
    // Action first, email as its side effect — no delivery-confirmation
    // deferral, no dedup query on the action path.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(create).toHaveBeenCalledTimes(1);
    expect(taskTriggerCalls.length).toBe(1);
    const [{ id, payload }] = taskTriggerCalls;
    expect(id).toBe("process-team-notification");
    expect(payload.notification_type).toBe("subscription_alert");
    expect(payload.message).toContain("has been updated to the 2500-post plan");
    const metadata = payload.meta_data as any;
    // No threshold on a subscription update — the facts are posts delivered,
    // posts allowed now, posts allowed next cycle.
    expect(metadata.tracking.threshold).toBeUndefined();
    expect(metadata.tracking.usage_count).toBe(1200);
    expect(metadata.tracking.current_limit).toBe(1000);
    expect(metadata.tracking.new_plan_post_limit).toBe(2500);
    expect(metadata.data.loops.transactional_id).toBe("loops_subscription_alert");
    // The action path needs no team_notifications lookup at all.
    expect(teamNotificationsQueryCount).toBe(0);
  });

  test("usage within the scheduled plan's limit and email delivered: no update, no email", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        type: "subscription_alert",
        currentLimit: 1000,
        newPlanPostLimit: 2500,
        statuses: ["sent"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockExistingScheduleAtTier25k();
    refuseSubscriptionScheduleWrites();

    // 2,000 posts is over the current 1k limit but within the scheduled
    // 2.5k plan — no subscription change, so no email.
    await mod.processExceededUsageWindow(
      makeUsageWindow({ count: 2000 }) as any,
    );

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("heal: the update's email never delivered, so it retries on the same record", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      alertRow({
        id: "tn_update_email",
        type: "subscription_alert",
        currentLimit: 1000,
        newPlanPostLimit: 2500,
        statuses: ["failed"],
      }),
    ]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockExistingScheduleAtTier25k();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(
      makeUsageWindow({ count: 2000 }) as any,
    );

    expect(taskTriggerCalls.length).toBe(1);
    expect(taskTriggerCalls[0].payload.id).toBe("tn_update_email");
  });

  test("heal: the update's email dispatch was lost entirely, so it re-sends fresh", async () => {
    // A schedule exists (the update DID happen) but no subscription_alert
    // record exists at all — the original tasks.trigger never landed.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockExistingScheduleAtTier25k();
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(
      makeUsageWindow({ count: 2000 }) as any,
    );

    expect(taskTriggerCalls.length).toBe(1);
    const payload = taskTriggerCalls[0].payload;
    expect(payload.notification_type).toBe("subscription_alert");
    expect((payload.meta_data as any).tracking.new_plan_post_limit).toBe(2500);
  });

  test("escalation: usage outgrows the scheduled plan, so the subscription updates again and a new email fires", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([
      // The 2.5k update's email was already delivered — a NEW update to a
      // further plan still emails, because the action fired again.
      alertRow({
        type: "subscription_alert",
        currentLimit: 1000,
        newPlanPostLimit: 2500,
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
    expect(taskTriggerCalls.length).toBe(1);
    const payload = taskTriggerCalls[0].payload;
    expect(payload.notification_type).toBe("subscription_alert");
    expect((payload.meta_data as any).tracking.new_plan_post_limit).toBe(5000);
  });

  test("escalation: a burst that skips multiple tiers converges to the correct plan in one step", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockExistingScheduleAtTier25k();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(
      // 12,000 posts skips tier_5k (5,000) and tier_10k (10,000) — the
      // correct landing plan is tier_20k (20,000).
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
        .new_plan_post_limit,
    ).toBe(20000);
  });

  test("never-eligible team over 100%: no update, no email", async () => {
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({ data: [] })) as any;

    await mod.processExceededUsageWindow(makeUsageWindow() as any);

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("exempt team over 100%: no Stripe calls, no update, no email", async () => {
    // team_exempt is in USAGE_UPGRADE_EXEMPTIONS (set at the top of this
    // file) with a far-future date — the old system promised them no
    // auto-upgrade, so the whole action path short-circuits.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(() => {
      throw new Error("exempt team must not hit Stripe");
    }) as any;
    refuseSubscriptionScheduleWrites();

    await mod.processExceededUsageWindow(
      makeUsageWindow({ team_id: "team_exempt" }) as any,
    );

    expect(taskTriggerCalls.length).toBe(0);
  });

  test("an expired exemption no longer blocks the upgrade", async () => {
    // team_expired's date is in the past — the promise window is over, so
    // the normal first-crossing flow runs: schedule + email.
    mod.supabaseClient.from = fakeSupabaseFrom([]) as any;
    mod.stripe.subscriptions.list = mock(async () => ({
      data: [makeSubscription()],
    })) as any;
    mockNoActiveSchedules();
    const { create } = mockScheduleCreation();

    await mod.processExceededUsageWindow(
      makeUsageWindow({ team_id: "team_expired" }) as any,
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(taskTriggerCalls.length).toBe(1);
    expect(taskTriggerCalls[0].payload.notification_type).toBe(
      "subscription_alert",
    );
  });
});
