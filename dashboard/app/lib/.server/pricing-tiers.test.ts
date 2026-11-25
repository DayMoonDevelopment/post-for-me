import { afterAll, describe, expect, it, vi } from "vitest";

import { getNextTier, resolveTargetTier } from "./pricing-tiers";
import { ENTERPRISE_TIERS, PRICING_TIERS } from "./stripe.constants";
import type { PlanInfo } from "./get-subscription-plan-info";

vi.hoisted(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_pricing");
  vi.stubEnv("STRIPE_API_PRODUCT_ID", "prod_legacy");
  for (const tier of [
    "1K",
    "2_5K",
    "5K",
    "10K",
    "20K",
    "40K",
    "100K",
    "200K",
  ]) {
    vi.stubEnv(`STRIPE_PRICING_TIER_${tier}_PRODUCT_ID`, `prod_${tier}`);
  }
  vi.stubEnv(
    "STRIPE_PRICING_TIER_ENTERPRISE_300K_PRODUCT_ID",
    "prod_enterprise",
  );
});

afterAll(() => vi.unstubAllEnvs());

const tiers = [
  { productId: "prod_1k", name: "Pro", posts: 1000, price: 10 },
  { productId: "prod_5k", name: "Pro", posts: 5000, price: 50 },
  { productId: "prod_10k", name: "Pro", posts: 10000, price: 75 },
];

function planInfo(overrides: Partial<PlanInfo> = {}): PlanInfo {
  return {
    isLegacy: false,
    isNewPricing: false,
    productId: null,
    planName: null,
    postLimit: null,
    price: null,
    includesSystemCredentials: false,
    ...overrides,
  };
}

describe("getNextTier", () => {
  it("never upgrades an enterprise plan or offers enterprise above 200K", () => {
    expect(ENTERPRISE_TIERS).toHaveLength(1);
    expect(PRICING_TIERS).toHaveLength(8);
    expect(
      PRICING_TIERS.some((tier) => tier.productId === "prod_enterprise"),
    ).toBe(false);
    expect(getNextTier("prod_enterprise", PRICING_TIERS)).toBeNull();
    expect(getNextTier("prod_200K", PRICING_TIERS)).toBeNull();
    for (const tier of PRICING_TIERS) {
      expect(getNextTier(tier.productId, PRICING_TIERS)?.productId).not.toBe(
        "prod_enterprise",
      );
    }
  });

  it("returns the tier immediately above the current one by posts", () => {
    expect(getNextTier("prod_1k", tiers)?.productId).toBe("prod_5k");
  });

  it("returns null when already on the highest tier", () => {
    expect(getNextTier("prod_10k", tiers)).toBeNull();
  });

  it("returns null when the current product id isn't in the tier list", () => {
    expect(getNextTier("prod_unknown", tiers)).toBeNull();
  });

  it("returns null when currentProductId is null", () => {
    expect(getNextTier(null, tiers)).toBeNull();
  });

  it("is unaffected by declaration order, only by posts", () => {
    const shuffled = [tiers[2]!, tiers[0]!, tiers[1]!];
    expect(getNextTier("prod_1k", shuffled)?.productId).toBe("prod_5k");
  });
});

describe("resolveTargetTier", () => {
  it("never accepts enterprise as a checkout target", () => {
    for (const tierIndexRaw of [
      String(PRICING_TIERS.length),
      "prod_enterprise",
    ]) {
      expect(resolveTargetTier({ tierIndexRaw, planInfo: null }).ok).toBe(
        false,
      );
    }
    for (let index = 0; index < PRICING_TIERS.length; index++) {
      const result = resolveTargetTier({
        tierIndexRaw: String(index),
        planInfo: null,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.tier.productId).not.toBe("prod_enterprise");
    }
  });

  it("does not offer self-serve upgrades to an enterprise team", () => {
    const enterprisePlan = planInfo({ isNewPricing: true, postLimit: 300000 });
    for (let index = 0; index < PRICING_TIERS.length; index++) {
      expect(
        resolveTargetTier({
          tierIndexRaw: String(index),
          planInfo: enterprisePlan,
        }).ok,
      ).toBe(false);
    }
  });

  it("rejects a non-numeric tierIndex", () => {
    const result = resolveTargetTier({
      tierIndexRaw: "not-a-number",
      planInfo: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-range tierIndex", () => {
    const result = resolveTargetTier({
      tierIndexRaw: String(PRICING_TIERS.length + 10),
      planInfo: null,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid tierIndex with no current plan info", () => {
    const result = resolveTargetTier({ tierIndexRaw: "0", planInfo: null });
    expect(result).toEqual({
      ok: true,
      tier: expect.objectContaining({ productId: PRICING_TIERS[0]!.productId }),
    });
  });

  it("accepts a valid tierIndex for a legacy-plan team (postLimit is null)", () => {
    const result = resolveTargetTier({
      tierIndexRaw: "0",
      planInfo: planInfo({ isLegacy: true, postLimit: null }),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a target tier that isn't an upgrade from the current new-pricing tier", () => {
    const currentPostLimit = PRICING_TIERS[0]!.posts;
    const result = resolveTargetTier({
      tierIndexRaw: "0",
      planInfo: planInfo({ isNewPricing: true, postLimit: currentPostLimit }),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a strict upgrade from the current new-pricing tier", () => {
    if (PRICING_TIERS.length < 2) {
      // Not enough configured tiers in this environment to exercise an upgrade.
      return;
    }
    const currentPostLimit = PRICING_TIERS[0]!.posts;
    const result = resolveTargetTier({
      tierIndexRaw: "1",
      planInfo: planInfo({ isNewPricing: true, postLimit: currentPostLimit }),
    });
    expect(result.ok).toBe(true);
  });
});
