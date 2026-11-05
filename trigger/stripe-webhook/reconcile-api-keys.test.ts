import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { Unkey } from "@unkey/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database } from "../supabase.types";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_PRICING_TIER_1K_PRODUCT_ID = "tier_1k";
process.env.STRIPE_PRICING_TIER_5K_PRODUCT_ID = "tier_5k";
process.env.STRIPE_API_PRODUCT_ID = "tier_legacy";
process.env.UNKEY_ROOT_KEY = "root_test";
process.env.UNKEY_API_ID = "api_test";

let billing: typeof import("./billing");
let reconcileAPIKeys: typeof import("./reconcile-api-keys").reconcileAPIKeys;
const unkey = new Unkey({ rootKey: "root_test" });
// Resource methods are inherited by the implementation's private client, too.
const apis = Object.getPrototypeOf(unkey.apis) as typeof unkey.apis;
const keys = Object.getPrototypeOf(unkey.keys) as typeof unkey.keys;

beforeAll(async () => {
  billing = await import("./billing");
  ({ reconcileAPIKeys } = await import("./reconcile-api-keys"));
});
afterEach(() => mock.restore());

function subscription(status: Stripe.Subscription.Status = "active", product = "tier_5k", id = "sub_current", allowsSystem = false): Stripe.Subscription {
  return {
    id, customer: "cus_1", status,
    items: { data: [{ price: { product, metadata: { allows_system_credentials_access: String(allowsSystem) } } }] },
  } as unknown as Stripe.Subscription;
}

type Project = { id: string; is_system: boolean };
function database({
  projects = [{ id: "project_1", is_system: false }] as Project[],
  teams = [{ id: "team_1" }] as ({ id: string } | null)[],
  teamError = null as Error | null,
  projectError = null as Error | null,
  updateError = null as Error | null,
  linkError = null as Error | null,
} = {}) {
  let reads = 0;
  const update = mock((_value: unknown) => query);
  const eq = mock((_column: string, _value: unknown) => query);
  const is = mock((_column: string, _value: unknown) => query);
  const range = mock(async (start: number, end: number) => ({ data: projects.slice(start, end + 1), error: projectError }));
  const query = {
    select: mock((_columns: string) => query), eq, is, update,
    order: mock((_column: string) => query), range,
    maybeSingle: mock(async () => ({ data: teams[Math.min(reads++, teams.length - 1)], error: reads === 1 ? teamError : linkError })),
    then: (resolve: (result: { error: Error | null }) => unknown) => resolve({ error: updateError }),
  };
  const from = mock((_table: string) => query);
  return { client: { from } as unknown as SupabaseClient<Database>, from, update, eq, is, range, query };
}

describe("reconcileAPIKeys", () => {
  beforeEach(() => {
    spyOn(console, "log").mockImplementation(() => {});
    spyOn(billing.stripe.subscriptions, "list").mockResolvedValue({ data: [subscription()], has_more: false } as never);
    spyOn(billing.stripe.customers, "retrieve").mockResolvedValue({ id: "cus_1", metadata: { team_id: "team_1" } } as never);
    spyOn(apis, "listKeys").mockResolvedValue({ data: [{ keyId: "key_1", meta: { custom: "preserve" } }], pagination: { hasMore: false } } as never);
    spyOn(keys, "updateKey").mockResolvedValue({ data: {} } as never);
  });

  test.each([301, 1001])("visits every one of %i projects using ordered, inclusive ranges", async (count) => {
    const projects = Array.from({ length: count }, (_, i) => ({ id: `project_${String(i).padStart(4, "0")}`, is_system: false }));
    const db = database({ projects });
    await reconcileAPIKeys("cus_1", db.client);
    expect(db.query.order).toHaveBeenCalledWith("id");
    expect(db.range.mock.calls).toEqual(count > 1000 ? [[0, 999], [1000, 1999]] : [[0, 999]]);
    expect(apis.listKeys).toHaveBeenCalledTimes(count);
    expect(new Set((apis.listKeys as ReturnType<typeof mock>).mock.calls.map(([request]) => request.externalId)).size).toBe(count);
    expect(apis.listKeys).toHaveBeenLastCalledWith(expect.objectContaining({ externalId: projects.at(-1)!.id, revalidateKeysCache: true }));
    expect(keys.updateKey).toHaveBeenCalledTimes(count);
  });

  test("paginates keys, preserves unrelated metadata, and bounds in-flight updates to ten", async () => {
    const page = Array.from({ length: 23 }, (_, i) => ({ keyId: `key_${i}`, meta: { custom: "keep", nested: { value: 1 }, plan_name: "old" } }));
    spyOn(apis, "listKeys")
      .mockResolvedValueOnce({ data: page, pagination: { hasMore: true, cursor: "next_page" } } as never)
      .mockResolvedValueOnce({ data: [{ keyId: "last", meta: null }], pagination: { hasMore: false } } as never);
    let inFlight = 0;
    let maximum = 0;
    spyOn(keys, "updateKey").mockImplementation(async () => {
      maximum = Math.max(maximum, ++inFlight);
      await Bun.sleep(1);
      inFlight--;
      return { data: {} } as never;
    });
    await reconcileAPIKeys("cus_1", database().client);
    expect(maximum).toBe(10);
    expect(inFlight).toBe(0);
    expect(apis.listKeys).toHaveBeenNthCalledWith(2, { apiId: "api_test", externalId: "project_1", limit: 100, cursor: "next_page", revalidateKeysCache: true });
    expect(keys.updateKey).toHaveBeenCalledTimes(24);
    expect(keys.updateKey).toHaveBeenNthCalledWith(1, { keyId: "key_0", enabled: true, meta: {
      custom: "keep", nested: { value: 1 }, plan_name: "Pro", plan_product_id: "tier_5k", plan_post_limit: "5000", plan_type: "new_pricing",
    } });
    expect(keys.updateKey).toHaveBeenLastCalledWith(expect.objectContaining({ keyId: "last", enabled: true }));
  });

  test("paginates current subscriptions and keeps access when another subscription remains active", async () => {
    const current = subscription();
    spyOn(billing.stripe.subscriptions, "list")
      .mockResolvedValueOnce({ data: [subscription("canceled", "tier_legacy", "sub_old")], has_more: true } as never)
      .mockResolvedValueOnce({ data: [current], has_more: false } as never);
    const db = database({ projects: [{ id: "system", is_system: true }] });
    expect(await reconcileAPIKeys("cus_1", db.client)).toEqual([current]);
    expect(billing.stripe.subscriptions.list).toHaveBeenNthCalledWith(2, { customer: "cus_1", status: "all", limit: 100, starting_after: "sub_old" });
    expect(keys.updateKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  test.each([
    ["trialing", "tier_5k", false, true, false],
    ["active", "tier_legacy", false, true, false],
    ["active", "unknown", true, true, true],
    ["active", "tier_5k", false, true, true],
    ["past_due", "tier_5k", true, false, false],
    ["canceled", "tier_5k", false, false, false],
  ] as const)("%s %s entitlement (metadata override: %s)", async (status, product, override, customEnabled, systemEnabled) => {
    const current = subscription(status, product, "sub_current", override);
    spyOn(billing.stripe.subscriptions, "list").mockResolvedValue({ data: [current], has_more: false } as never);
    const db = database({ projects: [{ id: "custom", is_system: false }, { id: "system", is_system: true }] });
    expect(await reconcileAPIKeys("cus_1", db.client)).toEqual(customEnabled ? [current] : []);
    expect(keys.updateKey).toHaveBeenNthCalledWith(1, expect.objectContaining({ enabled: customEnabled }));
    expect(keys.updateKey).toHaveBeenNthCalledWith(2, expect.objectContaining({ enabled: systemEnabled }));
  });

  test("system entitlement considers all active subscriptions and all line items", async () => {
    const addon = subscription("active", "unknown", "sub_addon");
    addon.items.data.push({ price: { product: { id: "tier_5k" }, metadata: {} } } as Stripe.SubscriptionItem);
    spyOn(billing.stripe.subscriptions, "list").mockResolvedValue({ data: [subscription("active", "tier_legacy"), addon], has_more: false } as never);
    await reconcileAPIKeys("cus_1", database({ projects: [{ id: "system", is_system: true }] }).client);
    expect(keys.updateKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  test("links an unlinked customer using current Stripe metadata before reconciling", async () => {
    const db = database({ teams: [null, { id: "team_1" }] });
    await reconcileAPIKeys("cus_1", db.client);
    expect(billing.stripe.customers.retrieve).toHaveBeenCalledWith("cus_1");
    expect(db.update).toHaveBeenCalledWith({ stripe_customer_id: "cus_1" });
    expect(db.eq).toHaveBeenCalledWith("id", "team_1");
    expect(db.is).toHaveBeenCalledWith("stripe_customer_id", null);
    expect(keys.updateKey).toHaveBeenCalledTimes(1);
  });

  test.each([{ id: "cus_1", deleted: true }, { id: "cus_1", metadata: {} }])("skips a missing team with unusable current customer: %j", async (customer) => {
    spyOn(billing.stripe.customers, "retrieve").mockResolvedValue(customer as never);
    const db = database({ teams: [null] });
    expect(await reconcileAPIKeys("cus_1", db.client)).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
    expect(apis.listKeys).not.toHaveBeenCalled();
  });

  test("fails rather than dropping access reconciliation if linking did not establish the customer", async () => {
    await expect(reconcileAPIKeys("cus_1", database({ teams: [null] }).client)).rejects.toThrow("Unable to link Stripe customer");
  });

  test.each(["teamError", "projectError", "updateError", "linkError"] as const)("propagates Supabase %s for task retry", async (field) => {
    const failure = new Error(field);
    const db = database({ [field]: failure, teams: field === "updateError" || field === "linkError" ? [null, { id: "team_1" }] : [{ id: "team_1" }] });
    await expect(reconcileAPIKeys("cus_1", db.client)).rejects.toBe(failure);
    expect(keys.updateKey).not.toHaveBeenCalled();
  });

  test.each(["list", "update"] as const)("propagates Unkey %s SDK API rejections and succeeds on retry", async (operation) => {
    const failure = new Error("RATE_LIMITED");
    if (operation === "list") spyOn(apis, "listKeys").mockRejectedValueOnce(failure);
    else spyOn(keys, "updateKey").mockRejectedValueOnce(failure);
    await expect(reconcileAPIKeys("cus_1", database().client)).rejects.toBe(failure);
    await expect(reconcileAPIKeys("cus_1", database().client)).resolves.toHaveLength(1);
  });

  test.each(["list", "update"] as const)("propagates Unkey %s thrown failures and succeeds on retry", async (operation) => {
    const failure = new Error("network unavailable");
    if (operation === "list") spyOn(apis, "listKeys").mockRejectedValueOnce(failure);
    else spyOn(keys, "updateKey").mockRejectedValueOnce(failure);
    await expect(reconcileAPIKeys("cus_1", database().client)).rejects.toBe(failure);
    await expect(reconcileAPIKeys("cus_1", database().client)).resolves.toHaveLength(1);
  });

  test("settles the failing batch before rejecting and does not start the next batch", async () => {
    spyOn(apis, "listKeys").mockResolvedValue({ data: Array.from({ length: 11 }, (_, i) => ({ keyId: `key_${i}`, meta: {} })) } as never);
    const failure = new Error("write failed");
    let settled = 0;
    spyOn(keys, "updateKey").mockImplementation(async ({ keyId }) => {
      if (keyId === "key_0") throw failure;
      await Bun.sleep(5);
      settled++;
      return { data: {} } as never;
    });
    await expect(reconcileAPIKeys("cus_1", database().client)).rejects.toBe(failure);
    expect(settled).toBe(9);
    expect(keys.updateKey).toHaveBeenCalledTimes(10);
  });

  test("rejects missing Unkey data", async () => {
    spyOn(apis, "listKeys").mockResolvedValue({} as never);
    await expect(reconcileAPIKeys("cus_1", database().client)).rejects.toThrow("Missing key list");
  });

  test.each([undefined, "same_cursor"])("rejects missing or repeated key pagination cursor: %s", async (cursor) => {
    spyOn(apis, "listKeys")
      .mockResolvedValueOnce({ data: [], pagination: { hasMore: true, cursor: "same_cursor" } } as never)
      .mockResolvedValueOnce({ data: [], pagination: { hasMore: true, cursor } } as never);
    await expect(reconcileAPIKeys("cus_1", database().client)).rejects.toThrow("Invalid key pagination");
    expect(apis.listKeys).toHaveBeenCalledTimes(2);
  });

  test("propagates current Stripe subscription retrieval failures", async () => {
    const failure = new Error("Stripe unavailable");
    spyOn(billing.stripe.subscriptions, "list").mockRejectedValue(failure);
    await expect(reconcileAPIKeys("cus_1", database().client)).rejects.toBe(failure);
    expect(apis.listKeys).not.toHaveBeenCalled();
  });
});
