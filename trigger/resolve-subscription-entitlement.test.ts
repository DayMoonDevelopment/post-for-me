import { describe, expect, it } from "vitest";

import {
  reduceSubscriptionsToEntitlement,
  selectBillableSubscription,
} from "./resolve-subscription-entitlement";

import type Stripe from "stripe";

// Match the placeholder ids vitest.config.ts puts in the environment.
const TIER_1K = "prod_tier_1k";
const TIER_2_5K = "prod_tier_2_5k";
const LEGACY_API = "prod_legacy_api";
const ADDON = "prod_addon";

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
      ["incomplete", "immediate_revoke"],
      ["incomplete_expired", "immediate_revoke"],
      ["past_due", "payment_failure"],
      ["unpaid", "payment_failure"],
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
      expect(result.planMetadata).toBeNull();
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

    // Stripe leaves an abandoned checkout's subscription `incomplete` for ~23
    // hours. Treating that as a payment failure handed a team that had just
    // cancelled a full grace period, so their keys kept working for days.
    it("still revokes a cancellation sitting next to a leftover incomplete", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("incomplete"),
        subscription("canceled"),
      ]);

      expect(result.verdict).toBe("immediate_revoke");
    });
  });

  describe("plan metadata", () => {
    it("describes a new-pricing tier", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [{ productId: TIER_1K }]),
      ]);

      expect(result.planMetadata).toEqual({
        plan_product_id: TIER_1K,
        plan_name: "Pro",
        plan_post_limit: "1000",
        plan_type: "new_pricing",
      });
    });

    it("describes a legacy plan", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [{ productId: LEGACY_API }]),
      ]);

      expect(result.planMetadata).toEqual({
        plan_product_id: LEGACY_API,
        plan_name: "Legacy Plan",
        plan_type: "legacy",
      });
    });

    it("falls back to unknown for an unrecognized product", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [{ productId: "prod_something_else" }]),
      ]);

      expect(result.planMetadata).toEqual({ plan_type: "unknown" });
    });

    it("names the plan from the tier subscription, not the add-on", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [
          { productId: ADDON, allowsSystemCredentials: true },
        ]),
        subscription("active", [{ productId: TIER_2_5K }]),
      ]);

      expect(result.planMetadata).toMatchObject({
        plan_product_id: TIER_2_5K,
        plan_post_limit: "2500",
        plan_type: "new_pricing",
      });
    });

    // The sweep re-enables teams inside their grace window, and
    // update-api-key-access.ts stamps whatever lands here. Reporting `null`
    // meant an in-grace team got its `enabled` bit repaired but kept a stale
    // `plan_type` beside it — and api/src/auth/auth.guard.ts 401s
    // /social-account-feeds on anything but "new_pricing".
    it("still describes the plan while a payment is failing", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("past_due", [{ productId: TIER_1K }]),
      ]);

      expect(result.verdict).toBe("payment_failure");
      expect(result.planMetadata).toMatchObject({
        plan_product_id: TIER_1K,
        plan_type: "new_pricing",
      });
    });

    // Nothing is being granted on this path, and an empty plan would wipe the
    // metadata off keys on their way down.
    it("describes no plan when access is revoked", () => {
      expect(
        reduceSubscriptionsToEntitlement([
          subscription("canceled", [{ productId: TIER_1K }]),
        ]).planMetadata,
      ).toBeNull();
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
      expect(result.grantsSystemCredentials).toBe(false);
    });

    it("is granted by a legacy plan carrying the add-on price", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("active", [
          { productId: LEGACY_API },
          { productId: ADDON, allowsSystemCredentials: true },
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

    // The reconcile sweep re-enables teams inside their grace window. If a
    // past_due subscription reported `false` here, that sync would disable the
    // team's managed-credential projects — a downgrade in the middle of the
    // grace period it was promised.
    it("reports what a payment-failing subscription would grant", () => {
      const result = reduceSubscriptionsToEntitlement([
        subscription("past_due", [{ productId: TIER_1K }]),
      ]);

      expect(result.verdict).toBe("payment_failure");
      expect(result.grantsSystemCredentials).toBe(true);
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

// increment-team-usage.ts meters against whatever this returns. It has to agree
// with the verdict above about which teams have access, or posts publish and
// then fail to meter — which is exactly what `status: "active"` did to trialing
// and in-grace teams.
describe("selectBillableSubscription", () => {
  it("returns nothing when the customer has no subscriptions", () => {
    expect(selectBillableSubscription([])).toBeNull();
  });

  it("returns the entitling subscription", () => {
    const active = subscription("active", [{ productId: TIER_1K }], "sub_live");

    expect(selectBillableSubscription([active])?.id).toBe("sub_live");
  });

  it("meters a trialing team", () => {
    const trial = subscription("trialing", [{ productId: TIER_1K }], "sub_trial");

    expect(selectBillableSubscription([trial])?.id).toBe("sub_trial");
  });

  it("meters a team inside its grace window", () => {
    const failing = subscription("past_due", [{ productId: TIER_1K }], "sub_late");

    expect(selectBillableSubscription([failing])?.id).toBe("sub_late");
  });

  it("prefers the tier subscription over the add-on", () => {
    const addon = subscription(
      "active",
      [{ productId: ADDON, allowsSystemCredentials: true }],
      "sub_addon",
    );
    const tier = subscription("active", [{ productId: TIER_1K }], "sub_tier");

    expect(selectBillableSubscription([addon, tier])?.id).toBe("sub_tier");
  });

  it("returns nothing when every subscription is a hard stop", () => {
    expect(
      selectBillableSubscription([
        subscription("canceled"),
        subscription("incomplete_expired"),
      ]),
    ).toBeNull();
  });

  it("agrees with the verdict on every status", () => {
    const statuses: Stripe.Subscription.Status[] = [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "paused",
      "canceled",
      "incomplete",
      "incomplete_expired",
    ];

    for (const status of statuses) {
      const subs = [subscription(status)];
      const revoked =
        reduceSubscriptionsToEntitlement(subs).verdict === "immediate_revoke";

      expect(selectBillableSubscription(subs) === null).toBe(revoked);
    }
  });
});
