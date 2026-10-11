import { describe, expect, it } from "vitest";

import { getNextTier, resolveTargetTier } from "./pricing-tiers";
import { PRICING_TIERS } from "./stripe.constants";
import type { PlanInfo } from "./get-subscription-plan-info";

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
