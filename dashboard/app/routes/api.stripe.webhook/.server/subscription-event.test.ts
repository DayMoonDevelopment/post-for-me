import { describe, expect, it, vi, beforeEach } from "vitest";

const updateAPIKeyAccessMock = vi.fn().mockResolvedValue(undefined);
const trackSubscriptionLifecycleMock = vi.fn().mockResolvedValue(undefined);
const syncTeamUsageLimitOnUpgradeMock = vi.fn().mockResolvedValue(undefined);
const retrieveSubscriptionMock = vi.fn();

vi.mock("~/lib/.server/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: (...args: unknown[]) => retrieveSubscriptionMock(...args),
    },
  },
}));

vi.mock("~/lib/.server/update-api-key-access.request", () => ({
  updateAPIKeyAccess: (...args: unknown[]) => updateAPIKeyAccessMock(...args),
}));

vi.mock("./subscription-lifecycle-tracking", () => ({
  trackSubscriptionLifecycle: (...args: unknown[]) =>
    trackSubscriptionLifecycleMock(...args),
}));

vi.mock("./sync-usage-limit", () => ({
  syncTeamUsageLimitOnUpgrade: (...args: unknown[]) =>
    syncTeamUsageLimitOnUpgradeMock(...args),
}));

const { handleSubscriptionEvent } = await import("./subscription-event");

const supabaseServiceRole = {} as never;

function subscriptionEvent(
  type: string,
  subscription: Record<string, unknown> = {},
): Parameters<typeof handleSubscriptionEvent>[0] {
  const object = {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    ...subscription,
  };

  return { type, data: { object } } as unknown as Parameters<
    typeof handleSubscriptionEvent
  >[0];
}

beforeEach(() => {
  retrieveSubscriptionMock.mockReset();
  retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status: "active" });
  updateAPIKeyAccessMock.mockClear();
  trackSubscriptionLifecycleMock.mockClear();
  syncTeamUsageLimitOnUpgradeMock.mockClear();
});

describe("handleSubscriptionEvent", () => {
  it.each(["past_due", "unpaid", "canceled"])(
    "enables keys when a stale %s event is retried after recovery",
    async (status) => {
      const event = subscriptionEvent("customer.subscription.updated", { status });

      await handleSubscriptionEvent(event, supabaseServiceRole);

      expect(retrieveSubscriptionMock).toHaveBeenCalledWith("sub_1");
      expect(updateAPIKeyAccessMock).toHaveBeenCalledWith(
        { stripeCustomerId: "cus_1", enabled: true },
        supabaseServiceRole,
      );
      expect(trackSubscriptionLifecycleMock).toHaveBeenCalledWith(
        event,
        supabaseServiceRole,
      );
    },
  );

  it.each(["past_due", "unpaid", "canceled"])(
    "disables keys when Stripe currently reports %s despite an old active event",
    async (status) => {
      retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status });

      await handleSubscriptionEvent(
        subscriptionEvent("customer.subscription.updated"),
        supabaseServiceRole,
      );

      expect(updateAPIKeyAccessMock).toHaveBeenCalledWith(
        { stripeCustomerId: "cus_1", enabled: false },
        supabaseServiceRole,
      );
    },
  );

  it("enables keys when the current subscription is trialing", async () => {
    retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status: "trialing" });

    await handleSubscriptionEvent(
      subscriptionEvent("customer.subscription.updated", { status: "past_due" }),
      supabaseServiceRole,
    );

    expect(updateAPIKeyAccessMock).toHaveBeenCalledWith(
      { stripeCustomerId: "cus_1", enabled: true },
      supabaseServiceRole,
    );
  });

  it("propagates Stripe lookup failures without toggling keys", async () => {
    const error = new Error("Stripe unavailable");
    retrieveSubscriptionMock.mockRejectedValueOnce(error);

    await expect(handleSubscriptionEvent(
      subscriptionEvent("customer.subscription.updated", { status: "past_due" }),
      supabaseServiceRole,
    )).rejects.toBe(error);

    expect(updateAPIKeyAccessMock).not.toHaveBeenCalled();
    expect(trackSubscriptionLifecycleMock).not.toHaveBeenCalled();
    expect(syncTeamUsageLimitOnUpgradeMock).not.toHaveBeenCalled();
  });

  it("invokes syncTeamUsageLimitOnUpgrade with the subscription on customer.subscription.updated", async () => {
    const event = subscriptionEvent("customer.subscription.updated");

    await handleSubscriptionEvent(event, supabaseServiceRole);

    expect(syncTeamUsageLimitOnUpgradeMock).toHaveBeenCalledTimes(1);
    expect(syncTeamUsageLimitOnUpgradeMock).toHaveBeenCalledWith(
      event.data.object,
      supabaseServiceRole,
    );
  });

  it("does not invoke syncTeamUsageLimitOnUpgrade on customer.subscription.created", async () => {
    const event = subscriptionEvent("customer.subscription.created");

    await handleSubscriptionEvent(event, supabaseServiceRole);

    expect(syncTeamUsageLimitOnUpgradeMock).not.toHaveBeenCalled();
  });

  it("does not invoke syncTeamUsageLimitOnUpgrade on customer.subscription.deleted", async () => {
    const event = subscriptionEvent("customer.subscription.deleted");

    await handleSubscriptionEvent(event, supabaseServiceRole);

    expect(syncTeamUsageLimitOnUpgradeMock).not.toHaveBeenCalled();
  });

  it("swallows a syncTeamUsageLimitOnUpgrade failure without throwing or skipping the API key toggle", async () => {
    syncTeamUsageLimitOnUpgradeMock.mockRejectedValueOnce(new Error("boom"));
    const event = subscriptionEvent("customer.subscription.updated");

    await expect(
      handleSubscriptionEvent(event, supabaseServiceRole),
    ).resolves.toBeUndefined();

    expect(updateAPIKeyAccessMock).toHaveBeenCalledTimes(1);
  });
});
