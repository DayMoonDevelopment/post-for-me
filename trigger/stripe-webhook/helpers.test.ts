import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database } from "../supabase.types";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_PRICING_TIER_1K_PRODUCT_ID = "tier_1k";
process.env.STRIPE_PRICING_TIER_5K_PRODUCT_ID = "tier_5k";
process.env.STRIPE_API_PRODUCT_ID = "tier_legacy";

let billing: typeof import("./billing");
let tracking: typeof import("./subscription-lifecycle-tracking");
let analytics: typeof import("../posthog");
let sync: typeof import("./sync-usage-limit");

beforeAll(async () => {
  billing = await import("./billing");
  analytics = await import("../posthog");
  tracking = await import("./subscription-lifecycle-tracking");
  sync = await import("./sync-usage-limit");
});

afterEach(() => mock.restore());

const team = { id: "team_1", created_by: "user_1", name: "Team", billing_email: null };
const oneHourFromNow = () => new Date(Date.now() + 3600000).toISOString();
const oneHourAgo = () => new Date(Date.now() - 3600000).toISOString();
const usageWindowRow = (limit = 1000, endAt = oneHourFromNow()) => ({
  team_id: team.id, count: 0, limit,
  start_at: "2026-08-01T00:00:00.000Z", end_at: endAt,
});

function subscription(product = "tier_5k", overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1", customer: "cus_1", metadata: { team_id: team.id },
    status: "active", currency: "usd", cancel_at_period_end: false,
    items: { data: [{ price: { product } }] }, ...overrides,
  } as Stripe.Subscription;
}

// Exercise the real resolveTeam and schedule-release helpers without network I/O.
function supabase({
  window = usageWindowRow(), teams = [team] as (typeof team | null)[],
  teamError = null as Error | null, windowError = null as Error | null,
  updateError = null as Error | null,
} = {}) {
  const update = mock((_value: unknown) => query);
  const eq = mock(() => query);
  let table = "";
  let teamRead = 0;
  let updating = false;
  const query = {
    select: mock(() => query), eq, order: mock(() => query), limit: mock(() => query),
    update: mock((value: unknown) => { updating = true; return update(value); }),
    maybeSingle: mock(async () => table === "teams"
      ? { data: teams[teamRead++] ?? null, error: teamError }
      : { data: window, error: windowError }),
    then: (resolve: (value: { error: Error | null }) => unknown) => resolve({ error: updating ? updateError : null }),
  };
  const from = mock((name: string) => { table = name; return query; });
  return { client: { from } as unknown as SupabaseClient<Database>, update, eq, from };
}

function product(limit?: string) {
  return { id: "tier_5k", metadata: limit ? { social_post_limit: limit } : {} } as Stripe.Product;
}

describe("syncTeamUsageLimitOnUpgrade (vendored dashboard cases)", () => {
  beforeEach(() => {
    spyOn(billing.stripe.products, "retrieve").mockResolvedValue(product("5000") as never);
    spyOn(billing.stripe.subscriptionSchedules, "list").mockResolvedValue({ data: [
      { id: "sched_upgrade", status: "active", metadata: { schedule_type: "usage_based_upgrade" } },
      { id: "sched_addon", status: "active", metadata: { schedule_type: "addon_removal" } },
    ] } as never);
    spyOn(billing.stripe.subscriptionSchedules, "release").mockResolvedValue({} as never);
  });

  test("does nothing without a team", async () => {
    const db = supabase({ teams: [null, null] });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(billing.stripe.products.retrieve).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  test.each([undefined, "invalid", "0", "-1", "Infinity"])("skips absent/invalid metadata: %s", async (limit) => {
    spyOn(billing.stripe.products, "retrieve").mockResolvedValue(product(limit) as never);
    const db = supabase();
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(db.update).not.toHaveBeenCalled();
    expect(billing.stripe.subscriptionSchedules.list).not.toHaveBeenCalled();
  });

  test("does nothing without a usage window", async () => {
    const db = supabase({ window: null as never });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(db.update).not.toHaveBeenCalled();
    expect(billing.stripe.subscriptionSchedules.list).not.toHaveBeenCalled();
  });

  test("does nothing for a closed usage window", async () => {
    const db = supabase({ window: usageWindowRow(1000, oneHourAgo()) });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(db.update).not.toHaveBeenCalled();
    expect(billing.stripe.subscriptionSchedules.list).not.toHaveBeenCalled();
  });

  test("does not lower caps or release schedules on downgrades", async () => {
    const db = supabase({ window: usageWindowRow(10000) });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(db.update).not.toHaveBeenCalled();
    expect(billing.stripe.subscriptionSchedules.list).not.toHaveBeenCalled();
  });

  test("leaves legitimate scheduled upgrades alone when the cap is unchanged", async () => {
    const db = supabase({ window: usageWindowRow(5000) });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(db.update).not.toHaveBeenCalled();
    expect(billing.stripe.subscriptionSchedules.list).not.toHaveBeenCalled();
    expect(billing.stripe.subscriptionSchedules.release).not.toHaveBeenCalled();
  });

  test("updates the exact open window and releases only active usage-upgrade schedules", async () => {
    const window = usageWindowRow();
    const db = supabase({ window });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client);
    expect(db.update).toHaveBeenCalledWith({ limit: 5000 });
    expect(db.eq).toHaveBeenCalledWith("team_id", team.id);
    expect(db.eq).toHaveBeenCalledWith("start_at", window.start_at);
    expect(db.eq).toHaveBeenCalledWith("end_at", window.end_at);
    expect(billing.stripe.subscriptionSchedules.list).toHaveBeenCalledWith({ customer: "cus_1", limit: 100 });
    expect(billing.stripe.subscriptionSchedules.release).toHaveBeenCalledTimes(1);
    expect(billing.stripe.subscriptionSchedules.release).toHaveBeenCalledWith("sched_upgrade");
  });

  test("resolves metadata from whichever caller-supplied line item carries it", async () => {
    spyOn(billing.stripe.products, "retrieve")
      .mockResolvedValueOnce(product() as never).mockResolvedValueOnce(product("5000") as never);
    const current = subscription();
    current.items.data.unshift({ price: { product: "prod_addon" } } as Stripe.SubscriptionItem);
    const db = supabase();
    await sync.syncTeamUsageLimitOnUpgrade(current, db.client);
    expect(billing.stripe.products.retrieve).toHaveBeenNthCalledWith(1, "prod_addon");
    expect(billing.stripe.products.retrieve).toHaveBeenNthCalledWith(2, "tier_5k");
    expect(db.update).toHaveBeenCalledWith({ limit: 5000 });
  });

  test("failed release leaves the cap unchanged so retry releases before updating", async () => {
    const failure = new Error("Stripe unavailable");
    spyOn(billing.stripe.subscriptionSchedules, "release").mockRejectedValueOnce(failure).mockResolvedValue({} as never);
    const first = supabase();
    await expect(sync.syncTeamUsageLimitOnUpgrade(subscription(), first.client)).rejects.toBe(failure);
    expect(first.update).not.toHaveBeenCalled();
    const retry = supabase();
    spyOn(billing.stripe.subscriptionSchedules, "release").mockImplementation(async () => {
      expect(retry.update).not.toHaveBeenCalled();
      return {} as never;
    });
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), retry.client);
    expect(retry.update).toHaveBeenCalledWith({ limit: 5000 });
    expect(billing.stripe.subscriptionSchedules.release).toHaveBeenCalledTimes(2);
  });

  test("retries after successful release followed by a failed cap update", async () => {
    const failure = new Error("database unavailable");
    const first = supabase({ updateError: failure });
    await expect(sync.syncTeamUsageLimitOnUpgrade(subscription(), first.client)).rejects.toBe(failure);
    expect(billing.stripe.subscriptionSchedules.release).toHaveBeenCalledWith("sched_upgrade");
    expect(first.update).toHaveBeenCalledWith({ limit: 5000 });

    // The released schedule is no longer active on the retry; the old cap remains.
    spyOn(billing.stripe.subscriptionSchedules, "list").mockResolvedValue({ data: [
      { id: "sched_upgrade", status: "released", metadata: { schedule_type: "usage_based_upgrade" } },
    ] } as never);
    const retry = supabase();
    await sync.syncTeamUsageLimitOnUpgrade(subscription(), retry.client);
    expect(billing.stripe.subscriptionSchedules.list).toHaveBeenCalledTimes(2);
    expect(billing.stripe.subscriptionSchedules.release).toHaveBeenCalledTimes(1);
    expect(retry.update).toHaveBeenCalledWith({ limit: 5000 });
  });

  test("propagates Stripe retrieval failures instead of treating them as missing metadata", async () => {
    const error = new Error("network");
    spyOn(billing.stripe.products, "retrieve").mockRejectedValue(error);
    const db = supabase();
    await expect(sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client)).rejects.toBe(error);
    expect(db.update).not.toHaveBeenCalled();
  });

  test.each(["windowError", "updateError"] as const)("propagates Supabase %s", async (key) => {
    const error = new Error(key);
    const db = supabase({ [key]: error });
    await expect(sync.syncTeamUsageLimitOnUpgrade(subscription(), db.client)).rejects.toBe(error);
    if (key === "windowError") {
      expect(billing.stripe.subscriptionSchedules.list).not.toHaveBeenCalled();
    } else {
      expect(billing.stripe.subscriptionSchedules.release).toHaveBeenCalledWith("sched_upgrade");
    }
  });
});

describe("releaseSchedulesForCustomer", () => {
  test("paginates past inactive schedules and releases only active matching schedules", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `sched_${index}`, status: "released", metadata: { schedule_type: "usage_based_upgrade" },
    }));
    const list = spyOn(billing.stripe.subscriptionSchedules, "list")
      .mockResolvedValueOnce({ data: firstPage, has_more: true } as never)
      .mockResolvedValueOnce({ data: [
        { id: "sched_upgrade", status: "active", metadata: { schedule_type: "usage_based_upgrade" } },
        { id: "sched_addon", status: "active", metadata: { schedule_type: "addon_removal" } },
        { id: "sched_canceled", status: "canceled", metadata: { schedule_type: "usage_based_upgrade" } },
      ], has_more: false } as never);
    const release = spyOn(billing.stripe.subscriptionSchedules, "release").mockResolvedValue({} as never);

    await billing.releaseSchedulesForCustomer({
      stripeCustomerId: "cus_1",
      criteria: { mode: "matching", type: billing.SCHEDULE_TYPE.USAGE_BASED_UPGRADE },
    });

    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenNthCalledWith(1, { customer: "cus_1", limit: 100 });
    expect(list).toHaveBeenNthCalledWith(2, { customer: "cus_1", limit: 100, starting_after: "sched_99" });
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith("sched_upgrade");
  });
});

describe("resolveTeam", () => {
  test("prefers metadata and falls back to customer only for absent teams", async () => {
    const db = supabase({ teams: [null, team] });
    expect(await tracking.resolveTeam(subscription(), db.client)).toEqual(team);
    expect(db.eq).toHaveBeenNthCalledWith(1, "id", team.id);
    expect(db.eq).toHaveBeenNthCalledWith(2, "stripe_customer_id", "cus_1");
  });

  test.each([true, false])("throws query failures (metadata present: %s)", async (metadataPresent) => {
    const error = new Error("database unavailable");
    const db = supabase({ teamError: error });
    await expect(tracking.resolveTeam(subscription("tier_5k", {
      metadata: metadataPresent ? { team_id: team.id } : {},
    }), db.client)).rejects.toBe(error);
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});

describe("trackSubscriptionLifecycle", () => {
  beforeEach(() => {
    spyOn(analytics, "captureServerEvent").mockResolvedValue();
    spyOn(analytics, "setTeamGroupProperties").mockResolvedValue();
    spyOn(billing.stripe.subscriptions, "list").mockResolvedValue({ data: [] } as never);
  });

  function event(type: string, current = subscription(), previous = {}) {
    return { id: "evt_1", type, created: 1720000000, data: { object: current, previous_attributes: previous } } as Parameters<typeof tracking.trackSubscriptionLifecycle>[0];
  }

  test("preserves conversion attribution, owner/group identity, source time and deterministic UUID", async () => {
    const current = subscription("tier_5k", { metadata: {
      team_id: team.id, gclid: "gclid", fbclid: "fbclid", fbc: "fbc", fbp: "fbp",
      utm_source: "google", utm_medium: "cpc", utm_campaign: "campaign", utm_term: "term", utm_content: "content",
      current_url: "https://app.postforme.dev/billing", user_agent: "browser",
    } });
    await tracking.trackSubscriptionLifecycle(event("customer.subscription.created", current), supabase().client);
    expect(analytics.captureServerEvent).toHaveBeenCalledWith({
      distinctId: team.created_by, event: "customer_converted", teamId: team.id,
      properties: {
        team_id: team.id, stripe_customer_id: "cus_1", subscription_id: "sub_1", plan_name: "Pro",
        plan_post_limit: 5000, plan_price: 50, price: 50, currency: "USD", is_legacy: false,
        gclid: "gclid", fbclid: "fbclid", fbc: "fbc", fbp: "fbp", utm_source: "google", utm_medium: "cpc",
        utm_campaign: "campaign", utm_term: "term", utm_content: "content",
        $current_url: "https://app.postforme.dev/billing", $raw_user_agent: "browser",
      },
      timestamp: new Date(1720000000000),
      dedupeKey: analytics.deterministicUuid("customer_converted:sub_1"),
    });
    expect(analytics.setTeamGroupProperties).toHaveBeenCalledWith(team.id, {
      name: team.name, subscription_status: "active", plan_name: "Pro", plan_post_limit: 5000,
      plan_price: 50, is_active: true, cancel_at_period_end: false,
    });
  });

  test.each(["incomplete", "incomplete_expired", "canceled"])("classifies prior %s subscriptions", async (status) => {
    spyOn(billing.stripe.subscriptions, "list").mockResolvedValue({ data: [{ id: "sub_prior", status }] } as never);
    await tracking.trackSubscriptionLifecycle(event("customer.subscription.created"), supabase().client);
    expect(analytics.captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: status === "canceled" ? "subscription_reactivated" : "customer_converted",
    }));
  });

  test.each([
    ["tier_5k", "tier_1k", "subscription_upgraded", 1000, 5000],
    ["tier_1k", "tier_5k", "subscription_downgraded", 5000, 1000],
  ] as const)("uses previous attributes for %s from %s", async (to, from, name, fromLimit, toLimit) => {
    const current = subscription(to, { cancel_at_period_end: true, cancel_at: 1800000000 });
    await tracking.trackSubscriptionLifecycle(event("customer.subscription.updated", current, {
      cancel_at_period_end: false, items: { data: [{ price: { product: { id: from } } }] },
    }), supabase().client);
    expect(analytics.captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: name, properties: expect.objectContaining({ from_post_limit: fromLimit, to_post_limit: toLimit }),
      timestamp: new Date(1720000000000),
      dedupeKey: analytics.deterministicUuid(`${name}:sub_1:${fromLimit}:${toLimit}`),
    }));
    expect(analytics.captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "subscription_cancel_scheduled", timestamp: new Date(1720000000000),
      dedupeKey: analytics.deterministicUuid("subscription_cancel_scheduled:sub_1:1800000000"),
    }));
  });

  test("does not invent transitions when previous attributes are absent", async () => {
    await tracking.trackSubscriptionLifecycle(event("customer.subscription.updated", subscription("tier_5k", {
      cancel_at_period_end: true,
    })), supabase().client);
    expect(analytics.captureServerEvent).toHaveBeenCalledTimes(1);
  });

  test("deletion marks the group inactive and emits only cancellation", async () => {
    await tracking.trackSubscriptionLifecycle(event("customer.subscription.deleted"), supabase().client);
    expect(analytics.setTeamGroupProperties).toHaveBeenCalledWith(team.id, expect.objectContaining({ is_active: false }));
    expect(analytics.captureServerEvent).toHaveBeenCalledTimes(1);
    expect(analytics.captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "subscription_canceled", timestamp: new Date(1720000000000),
      dedupeKey: analytics.deterministicUuid("subscription_canceled:sub_1"),
    }));
    expect(billing.stripe.subscriptions.list).not.toHaveBeenCalled();
  });
});

describe("getSubscriptionPlanInfo", () => {
  test("exposes new-plan entitlement, legacy and unknown plans", () => {
    expect(billing.getSubscriptionPlanInfo(subscription())).toMatchObject({
      isNewPricing: true, includesSystemCredentials: true, postLimit: 5000, price: 50,
    });
    expect(billing.getSubscriptionPlanInfo(subscription("tier_legacy"))).toMatchObject({
      isLegacy: true, includesSystemCredentials: false, postLimit: null,
    });
    expect(billing.getSubscriptionPlanInfo(null)).toMatchObject({
      isNewPricing: false, isLegacy: false, includesSystemCredentials: false,
    });
  });
});
