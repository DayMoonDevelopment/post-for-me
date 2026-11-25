import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function subscription(productId: string): Stripe.Subscription {
  return {
    status: "active",
    items: { data: [{ price: { product: productId } }] },
  } as Stripe.Subscription;
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_plans");
  vi.stubEnv("STRIPE_API_PRODUCT_ID", "prod_legacy");
  vi.stubEnv("STRIPE_PRICING_TIER_1K_PRODUCT_ID", "prod_1k");
  vi.stubEnv(
    "STRIPE_PRICING_TIER_ENTERPRISE_300K_PRODUCT_ID",
    "prod_enterprise",
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getSubscriptionPlanInfo", () => {
  it("recognizes enterprise as new pricing with its limit and system credentials", async () => {
    const { getSubscriptionPlanInfo } =
      await import("./get-subscription-plan-info");
    expect(getSubscriptionPlanInfo(subscription("prod_enterprise"))).toEqual({
      isLegacy: false,
      isNewPricing: true,
      productId: "prod_enterprise",
      planName: "Enterprise",
      postLimit: 300000,
      price: 1500,
      includesSystemCredentials: true,
    });
  });

  it("preserves self-serve plan recognition", async () => {
    const { getSubscriptionPlanInfo } =
      await import("./get-subscription-plan-info");
    expect(getSubscriptionPlanInfo(subscription("prod_1k"))).toEqual({
      isLegacy: false,
      isNewPricing: true,
      productId: "prod_1k",
      planName: "Pro",
      postLimit: 1000,
      price: 10,
      includesSystemCredentials: true,
    });
  });

  it("preserves legacy plan recognition", async () => {
    const { getSubscriptionPlanInfo } =
      await import("./get-subscription-plan-info");
    expect(getSubscriptionPlanInfo(subscription("prod_legacy"))).toEqual({
      isLegacy: true,
      isNewPricing: false,
      productId: "prod_legacy",
      planName: "Legacy Plan",
      postLimit: null,
      price: null,
      includesSystemCredentials: false,
    });
  });

  it("does not grant a plan to an unknown product or missing subscription", async () => {
    const { getSubscriptionPlanInfo } =
      await import("./get-subscription-plan-info");
    const noPlan = {
      isLegacy: false,
      isNewPricing: false,
      productId: null,
      planName: null,
      postLimit: null,
      price: null,
      includesSystemCredentials: false,
    };
    expect(getSubscriptionPlanInfo(subscription("prod_unknown"))).toEqual(
      noPlan,
    );
    expect(getSubscriptionPlanInfo(null)).toEqual(noPlan);
  });

  it("omits enterprise when its environment variable is unset", async () => {
    vi.stubEnv("STRIPE_PRICING_TIER_ENTERPRISE_300K_PRODUCT_ID", undefined);
    const { ENTERPRISE_TIERS, NEW_PRICING_TIER_PRODUCT_IDS } =
      await import("./stripe.constants");
    const { getSubscriptionPlanInfo } =
      await import("./get-subscription-plan-info");
    expect(ENTERPRISE_TIERS).toEqual([]);
    expect(NEW_PRICING_TIER_PRODUCT_IDS).not.toContain("");
    expect(
      getSubscriptionPlanInfo(subscription("prod_enterprise")).isNewPricing,
    ).toBe(false);
  });
});

describe("enterprise system credential access", () => {
  it("grants Quickstart access for an active enterprise subscription", async () => {
    const { stripe } = await import("./stripe");
    const listSubscriptions = vi
      .spyOn(stripe.subscriptions, "list")
      .mockResolvedValue({
        object: "list",
        data: [subscription("prod_enterprise")],
        has_more: false,
        url: "/v1/subscriptions",
        lastResponse: { headers: {}, requestId: "req_test", statusCode: 200 },
      });
    const { customerHasSubscriptionSystemCredsAddon } =
      await import("./customer-has-subscription-system-creds-addon.request");
    expect(
      await customerHasSubscriptionSystemCredsAddon("cus_enterprise"),
    ).toBe(true);
    expect(listSubscriptions).toHaveBeenCalledWith({
      customer: "cus_enterprise",
      status: "active",
    });
  });
});
