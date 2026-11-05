import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";
import type Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_PRICING_TIER_1K_PRODUCT_ID = "tier_1k";
process.env.STRIPE_PRICING_TIER_5K_PRODUCT_ID = "tier_5k";
process.env.STRIPE_API_PRODUCT_ID = "tier_legacy";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-dummy";
process.env.UNKEY_ROOT_KEY = "root_test";

let handler: typeof import("./process-stripe-webhook");
let reconcile: typeof import("./stripe-webhook/reconcile-api-keys");
let usage: typeof import("./stripe-webhook/sync-usage-limit");
let tracking: typeof import("./stripe-webhook/subscription-lifecycle-tracking");
let billing: typeof import("./stripe-webhook/billing");
let taskSupabase: SupabaseClient<Database>;

beforeAll(async () => {
  reconcile = await import("./stripe-webhook/reconcile-api-keys");
  usage = await import("./stripe-webhook/sync-usage-limit");
  tracking = await import("./stripe-webhook/subscription-lifecycle-tracking");
  billing = await import("./stripe-webhook/billing");
  handler = await import("./process-stripe-webhook");
});
afterEach(() => mock.restore());

const current = { id: "sub_1", status: "active", customer: "cus_1", metadata: { version: "current" } } as unknown as Stripe.Subscription;
function event(type: string, object: Record<string, unknown> = { id: "sub_1", customer: "cus_1", status: "canceled", metadata: { version: "historical" } }): Stripe.Event {
  return { id: "evt_old", type, created: 1720000000, data: { object, previous_attributes: { status: "active" } } } as unknown as Stripe.Event;
}

describe("handleStripeWebhook", () => {
  beforeEach(async () => {
    const reconcileSpy = spyOn(reconcile, "reconcileAPIKeys").mockResolvedValue([current]);
    spyOn(usage, "syncTeamUsageLimitOnUpgrade").mockResolvedValue();
    spyOn(tracking, "trackSubscriptionLifecycle").mockResolvedValue();
    spyOn(console, "error").mockImplementation(() => {});
    // Capture the handler's client, even if an older suite mocked createClient.
    await handler.handleStripeWebhook(event("invoice.paid"));
    taskSupabase = reconcileSpy.mock.calls[0][1];
    reconcileSpy.mockClear();
  });

  test.each([
    "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
    "invoice.created", "invoice.paid", "invoice.payment_succeeded",
  ])("dispatches %s reconciliation by customer", async (type) => {
    const original = event(type);
    await handler.handleStripeWebhook(original);
    expect(reconcile.reconcileAPIKeys).toHaveBeenCalledWith("cus_1", taskSupabase);
    expect(usage.syncTeamUsageLimitOnUpgrade).toHaveBeenCalledTimes(type === "customer.subscription.updated" ? 1 : 0);
    if (type.startsWith("customer.subscription.")) {
      expect(tracking.trackSubscriptionLifecycle).toHaveBeenCalledWith(original, taskSupabase);
    } else expect(tracking.trackSubscriptionLifecycle).not.toHaveBeenCalled();
  });

  test("uses the matching CURRENT subscription for usage but the unchanged original event for analytics", async () => {
    const other = { ...current, id: "sub_other" };
    spyOn(reconcile, "reconcileAPIKeys").mockResolvedValue([other, current]);
    const original = event("customer.subscription.updated");
    const snapshot = structuredClone(original);
    const order: string[] = [];
    spyOn(usage, "syncTeamUsageLimitOnUpgrade").mockImplementation(async (subscription) => {
      expect(subscription).toBe(current);
      order.push("usage");
    });
    spyOn(tracking, "trackSubscriptionLifecycle").mockImplementation(async (received) => {
      expect(received as Stripe.Event).toBe(original);
      order.push("analytics");
    });
    await handler.handleStripeWebhook(original);
    expect(order).toEqual(["usage", "analytics"]);
    expect(original).toEqual(snapshot);
  });

  test.each([{ subscriptions: [] }, { subscriptions: [{ ...current, id: "sub_other" }] }])("does not apply a historical usage cap when the event's subscription is no longer eligible: %j", async ({ subscriptions }) => {
    spyOn(reconcile, "reconcileAPIKeys").mockResolvedValue([...subscriptions]);
    await handler.handleStripeWebhook(event("customer.subscription.updated"));
    expect(usage.syncTeamUsageLimitOnUpgrade).not.toHaveBeenCalled();
    expect(tracking.trackSubscriptionLifecycle).toHaveBeenCalledTimes(1);
  });

  test("accepts expanded customer objects", async () => {
    await handler.handleStripeWebhook(event("invoice.paid", { customer: { id: "cus_expanded" } }));
    expect(reconcile.reconcileAPIKeys).toHaveBeenCalledWith("cus_expanded", taskSupabase);
  });

  test.each([null, undefined])("ignores invoices without a customer: %s", async (customer) => {
    await handler.handleStripeWebhook(event("invoice.created", { customer }));
    expect(reconcile.reconcileAPIKeys).not.toHaveBeenCalled();
  });

  test("ignores unrelated events", async () => {
    await handler.handleStripeWebhook(event("payment_intent.succeeded"));
    expect(reconcile.reconcileAPIKeys).not.toHaveBeenCalled();
    expect(tracking.trackSubscriptionLifecycle).not.toHaveBeenCalled();
  });

  test.each(["reconcile", "usage"])("propagates %s failures for retry before emitting analytics", async (step) => {
    const failure = new Error("retryable operational failure");
    if (step === "reconcile") spyOn(reconcile, "reconcileAPIKeys").mockRejectedValueOnce(failure);
    else spyOn(usage, "syncTeamUsageLimitOnUpgrade").mockRejectedValueOnce(failure);
    const original = event("customer.subscription.updated");
    await expect(handler.handleStripeWebhook(original)).rejects.toBe(failure);
    expect(tracking.trackSubscriptionLifecycle).not.toHaveBeenCalled();
    if (step === "reconcile") expect(usage.syncTeamUsageLimitOnUpgrade).not.toHaveBeenCalled();
    await handler.handleStripeWebhook(original);
    expect(tracking.trackSubscriptionLifecycle).toHaveBeenCalledTimes(1);
  });

  test("analytics preparation failure is best effort after operational work", async () => {
    const failure = new Error("analytics unavailable");
    spyOn(tracking, "trackSubscriptionLifecycle").mockRejectedValue(failure);
    await expect(handler.handleStripeWebhook(event("customer.subscription.updated"))).resolves.toBeUndefined();
    expect(usage.syncTeamUsageLimitOnUpgrade).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("Failed to track subscription lifecycle in PostHog:", failure);
  });

  function customerDatabase(error: Error | null = null) {
    const query = {
      update: mock((_value: unknown) => query),
      eq: mock((_column: string, _value: unknown) => query),
      is: mock(async (_column: string, _value: unknown) => ({ error })),
    };
    spyOn(taskSupabase, "from").mockReturnValue(query as never);
    return query;
  }

  test.each(["customer.created", "customer.updated"])("links %s using current metadata and only an unlinked team", async (type) => {
    const db = customerDatabase();
    spyOn(billing.stripe.customers, "retrieve").mockResolvedValue({ id: "cus_1", metadata: { team_id: "team_current" } } as never);
    await handler.handleStripeWebhook(event(type, { id: "cus_1", metadata: { team_id: "team_stale" } }));
    expect(billing.stripe.customers.retrieve).toHaveBeenCalledWith("cus_1");
    expect(taskSupabase.from).toHaveBeenCalledWith("teams");
    expect(db.update).toHaveBeenCalledWith({ stripe_customer_id: "cus_1" });
    expect(db.eq).toHaveBeenCalledWith("id", "team_current");
    expect(db.is).toHaveBeenCalledWith("stripe_customer_id", null);
    expect(reconcile.reconcileAPIKeys).not.toHaveBeenCalled();
  });

  test.each([{ id: "cus_1", deleted: true }, { id: "cus_1", metadata: {} }])("does not link deleted or metadata-less current customers: %j", async (customer) => {
    const db = customerDatabase();
    spyOn(billing.stripe.customers, "retrieve").mockResolvedValue(customer as never);
    await handler.handleStripeWebhook(event("customer.updated", { id: "cus_1", metadata: { team_id: "team_stale" } }));
    expect(db.update).not.toHaveBeenCalled();
  });

  test("propagates customer-link Supabase errors", async () => {
    const failure = new Error("database unavailable");
    customerDatabase(failure);
    spyOn(billing.stripe.customers, "retrieve").mockResolvedValue({ id: "cus_1", metadata: { team_id: "team_1" } } as never);
    await expect(handler.handleStripeWebhook(event("customer.created", { id: "cus_1" }))).rejects.toBe(failure);
  });

  test("propagates current customer retrieval failures", async () => {
    const failure = new Error("Stripe unavailable");
    const db = customerDatabase();
    spyOn(billing.stripe.customers, "retrieve").mockRejectedValue(failure);
    await expect(handler.handleStripeWebhook(event("customer.updated", { id: "cus_1" }))).rejects.toBe(failure);
    expect(db.update).not.toHaveBeenCalled();
  });
});
