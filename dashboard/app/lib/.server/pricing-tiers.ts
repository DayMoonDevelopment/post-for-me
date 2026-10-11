import { PRICING_TIERS } from "./stripe.constants";
import type { PlanInfo } from "./get-subscription-plan-info";

// Resolves "the next tier" by sorted post-count rather than array index, so
// a tier missing its env var (dropped by PRICING_TIERS's filter) can never
// cause this to land on the wrong tier or desync from the trigger sibling's
// copy (trigger/process-usage-limits.ts).
export function getNextTier(
  currentProductId: string | null,
  tiers: typeof PRICING_TIERS,
): (typeof PRICING_TIERS)[number] | null {
  if (!currentProductId) {
    return null;
  }

  const sorted = [...tiers].sort((a, b) => a.posts - b.posts);
  const currentIndex = sorted.findIndex(
    (tier) => tier.productId === currentProductId,
  );

  if (currentIndex === -1) {
    return null;
  }

  return sorted[currentIndex + 1] ?? null;
}

export type TierResolution =
  | { ok: true; tier: (typeof PRICING_TIERS)[number] }
  | { ok: false; error: string };

export function resolveTargetTier({
  tierIndexRaw,
  planInfo,
}: {
  tierIndexRaw: string;
  planInfo: PlanInfo | null;
}): TierResolution {
  const tierIndex = parseInt(tierIndexRaw, 10);
  const tier = Number.isInteger(tierIndex) ? PRICING_TIERS[tierIndex] : undefined;

  if (!tier || !tier.productId) {
    return { ok: false, error: "Invalid tier selected" };
  }

  if (
    planInfo?.isNewPricing &&
    planInfo.postLimit != null &&
    tier.posts <= planInfo.postLimit
  ) {
    return {
      ok: false,
      error: "Selected tier is not an upgrade from your current plan",
    };
  }

  return { ok: true, tier };
}
