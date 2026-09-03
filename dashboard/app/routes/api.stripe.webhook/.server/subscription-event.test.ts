import { describe, expect, it, vi, beforeEach } from "vitest";

const updateAPIKeyAccessMock = vi.fn().mockResolvedValue(undefined);
const trackSubscriptionLifecycleMock = vi.fn().mockResolvedValue(undefined);
const syncTeamUsageLimitOnUpgradeMock = vi.fn().mockResolvedValue(undefined);

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
  updateAPIKeyAccessMock.mockClear();
  trackSubscriptionLifecycleMock.mockClear();
  syncTeamUsageLimitOnUpgradeMock.mockClear();
});

describe("handleSubscriptionEvent", () => {
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
