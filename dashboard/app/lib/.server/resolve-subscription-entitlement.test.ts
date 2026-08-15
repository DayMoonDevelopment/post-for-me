import { describe, expect, it } from "vitest";

import { reduceSubscriptionsToEntitlement } from "./resolve-subscription-entitlement.request";

import type Stripe from "stripe";

const TIER_1K = "prod_tier_1k";
const LEGACY_API = "prod_legacy_api";

type ItemSpec = {
  productId: string;
  allowsSystemCredentials?: boolean;
};

/**
 * Minimal stand-in for a Stripe subscription — only the fields the reduction
 * actually reads. Cast because building a complete Stripe.Subscription by hand
 * is noise that would obscure what each case is testing.
 */
function subscription(
  status: Stripe.Subscription.Status,
  items: ItemSpec[] = [{ productId: TIER_1K }],
  id = `sub_${Math.random().toString(36).slice(2)}`,
): Stripe.Subscription {
  return {
    id,
    status,
    items: {
      data: items.map((item) => ({
        price: {
          product: item.productId,
          metadata: item.allowsSystemCredentials
            ? { allows_system_credentials_access: "true" }
            : {},
        },
      })),
    },
  } as unknown as Stripe.Subscription;
}

describe("reduceSubscriptionsToEntitlement", () => {
  describe("single subscription", () => {
    it.each([
      ["active", "entitled"],
      ["trialing", "entitled"],
      ["canceled", "immediate_revoke"],
      ["incomplete_expired", "immediate_revoke"],
      ["past_due", "payment_failure"],
      ["unpaid", "payment_failure"],
      ["incomplete", "payment_failure"],
      ["paused", "payment_failure"],
    ] as const)("classifies %s as %s", (status, verdict) => {
      const result = reduceSubscriptionsToEntitlement([subscription(status)]);

      expect(result.verdict).toBe(verdict);
      expect(result.latestStatus).toBe(status);
    });

    it("revokes immediately when the customer has no subscriptions", () => {
      const result = reduceSubscriptionsToEntitlement([]);

      expect(result.verdict).toBe("immediate_revoke");
      expect(result.latestStatus).toBeNull();
      expect(result.grantsSystemCredentials).toBe(false);
    });
  });

  describe("multiple subscriptions", () => {
    // The bug this exists to prevent: a customer holding a tier subscription
    // plus an add-on who cancels one of them was having ALL their keys revoked
    // while still paying on the other.
    it("stays entitled when only one of several subscriptions is canceled", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("canceled"),
        subscription("active"),
      ]);

      expect(result.verdict).toBe("entitled");
    });

    it("is order-independent", () => {
      const subs = [subscription("active"), subscription("canceled")];

      expect(reduceSubscriptionsToEntitlement(subs).verdict).toBe("entitled");
      expect(reduceSubscriptionsToEntitlement([...subs].reverse()).verdict).toBe(
        "entitled",
      );
    });

    it("prefers a grace period when nothing entitles but a payment failure exists", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("canceled"),
        subscription("past_due"),
      ]);

      expect(result.verdict).toBe("payment_failure");
      expect(result.latestStatus).toBe("past_due");
    });

    it("revokes immediately when every subscription is a hard stop", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("canceled"),
        subscription("incomplete_expired"),
      ]);

      expect(result.verdict).toBe("immediate_revoke");
    });

    it("names the plan from the tier subscription, not the add-on", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [
          { productId: "prod_addon", allowsSystemCredentials: true },
        ]),
        subscription("active", [{ productId: TIER_1K }]),
      ]);

      expect(result.planInfo.isNewPricing).toBe(true);
      expect(result.planInfo.productId).toBe(TIER_1K);
      expect(result.planInfo.postLimit).toBe(1000);
    });
  });

  describe("system credentials", () => {
    it("is granted by any new-pricing tier", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [{ productId: TIER_1K }]),
      ]);

      expect(result.grantsSystemCredentials).toBe(true);
    });

    it("is not granted by a legacy plan on its own", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [{ productId: LEGACY_API }]),
      ]);

      expect(result.verdict).toBe("entitled");
      expect(result.planInfo.isLegacy).toBe(true);
      expect(result.grantsSystemCredentials).toBe(false);
    });

    it("is granted by a legacy plan carrying the add-on price", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [
          { productId: LEGACY_API },
          { productId: "prod_addon", allowsSystemCredentials: true },
        ]),
      ]);

      expect(result.grantsSystemCredentials).toBe(true);
    });

    // Restoring access must never over-grant: a canceled tier subscription
    // sitting next to an entitling legacy plan shouldn't re-enable system keys.
    it("ignores non-entitling subscriptions when deciding the grant", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("canceled", [{ productId: TIER_1K }]),
        subscription("active", [{ productId: LEGACY_API }]),
      ]);

      expect(result.verdict).toBe("entitled");
      expect(result.grantsSystemCredentials).toBe(false);
    });

    it("is never granted when access is revoked", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("canceled", [{ productId: TIER_1K }]),
      ]);

      expect(result.verdict).toBe("immediate_revoke");
      expect(result.grantsSystemCredentials).toBe(false);
    });
  });
});
