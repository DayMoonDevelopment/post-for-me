import { describe, expect, it, vi, beforeEach } from "vitest";

const retrieveProductMock = vi.fn();
const releaseSchedulesForCustomerMock = vi.fn();

vi.mock("~/lib/.server/stripe", () => ({
  stripe: {
    products: {
      retrieve: (...args: unknown[]) => retrieveProductMock(...args),
    },
  },
}));

vi.mock("~/lib/.server/subscription-schedules", () => ({
  releaseSchedulesForCustomer: (...args: unknown[]) =>
    releaseSchedulesForCustomerMock(...args),
  SCHEDULE_TYPE: {
    USAGE_BASED_UPGRADE: "usage_based_upgrade",
    ADDON_REMOVAL: "addon_removal",
  },
}));

const resolveTeamMock = vi.fn();

vi.mock("./subscription-lifecycle-tracking", () => ({
  resolveTeam: (...args: unknown[]) => resolveTeamMock(...args),
}));

const { syncTeamUsageLimitOnUpgrade } = await import("./sync-usage-limit");

function product(id: string, socialPostLimit?: string) {
  return {
    id,
    deleted: false,
    metadata: socialPostLimit ? { social_post_limit: socialPostLimit } : {},
  };
}

function subscription({
  customerId = "cus_1",
  productId = "prod_1",
}: {
  customerId?: string;
  productId?: string;
} = {}) {
  return {
    customer: customerId,
    items: {
      data: [{ price: { product: productId } }],
    },
  } as never;
}

function usageWindowRow({
  limit,
  endAt,
}: {
  limit: number;
  endAt: string;
}) {
  return {
    team_id: "team_1",
    count: 0,
    limit,
    start_at: "2026-08-01T00:00:00.000Z",
    end_at: endAt,
  };
}

function supabaseServiceRole({
  window,
}: {
  window: ReturnType<typeof usageWindowRow> | null;
}) {
  const updateEqThird = vi.fn().mockResolvedValue({ error: null });
  const updateEqSecond = vi.fn(() => ({ eq: updateEqThird }));
  const updateEqFirst = vi.fn(() => ({ eq: updateEqSecond }));
  const update = vi.fn(() => ({ eq: updateEqFirst }));

  const maybeSingle = vi.fn().mockResolvedValue({ data: window, error: null });
  const limitFn = vi.fn(() => ({ maybeSingle }));
  const orderSecond = vi.fn(() => ({ limit: limitFn }));
  const orderFirst = vi.fn(() => ({ order: orderSecond }));
  const eq = vi.fn(() => ({ order: orderFirst }));
  const select = vi.fn(() => ({ eq }));

  const from = vi.fn(() => ({ select, update }));

  return {
    client: { from } as never,
    update,
    updateEqFirst,
    updateEqSecond,
    updateEqThird,
  };
}

const oneHourFromNow = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const oneHourAgo = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

beforeEach(() => {
  retrieveProductMock.mockReset();
  releaseSchedulesForCustomerMock.mockReset();
  resolveTeamMock.mockReset();
});

describe("syncTeamUsageLimitOnUpgrade", () => {
  it("does nothing when no team is found for the customer", async () => {
    resolveTeamMock.mockResolvedValue(null);
    const { client, update } = supabaseServiceRole({ window: null });

    await syncTeamUsageLimitOnUpgrade(subscription(), client);

    expect(retrieveProductMock).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(releaseSchedulesForCustomerMock).not.toHaveBeenCalled();
  });

  it("does nothing when no subscription item has valid social_post_limit metadata", async () => {
    resolveTeamMock.mockResolvedValue({ id: "team_1" });
    retrieveProductMock.mockResolvedValue(product("prod_1"));
    const { client, update } = supabaseServiceRole({ window: null });

    await expect(
      syncTeamUsageLimitOnUpgrade(subscription(), client),
    ).resolves.toBeUndefined();

    expect(update).not.toHaveBeenCalled();
    expect(releaseSchedulesForCustomerMock).not.toHaveBeenCalled();
  });

  it("does nothing when the team has no usage window at all", async () => {
    resolveTeamMock.mockResolvedValue({ id: "team_1" });
    retrieveProductMock.mockResolvedValue(product("prod_1", "5000"));
    const { client, update } = supabaseServiceRole({ window: null });

    await syncTeamUsageLimitOnUpgrade(subscription(), client);

    expect(update).not.toHaveBeenCalled();
    expect(releaseSchedulesForCustomerMock).not.toHaveBeenCalled();
  });

  it("does nothing when the latest usage window has already closed", async () => {
    resolveTeamMock.mockResolvedValue({ id: "team_1" });
    retrieveProductMock.mockResolvedValue(product("prod_1", "5000"));
    const { client, update } = supabaseServiceRole({
      window: usageWindowRow({ limit: 1000, endAt: oneHourAgo() }),
    });

    await syncTeamUsageLimitOnUpgrade(subscription(), client);

    expect(update).not.toHaveBeenCalled();
    expect(releaseSchedulesForCustomerMock).not.toHaveBeenCalled();
  });

  it("does nothing when the new limit is not an upgrade (same tier or downgrade)", async () => {
    resolveTeamMock.mockResolvedValue({ id: "team_1" });
    retrieveProductMock.mockResolvedValue(product("prod_1", "1000"));
    const { client, update } = supabaseServiceRole({
      window: usageWindowRow({ limit: 1000, endAt: oneHourFromNow() }),
    });

    await syncTeamUsageLimitOnUpgrade(subscription(), client);

    expect(update).not.toHaveBeenCalled();
    expect(releaseSchedulesForCustomerMock).not.toHaveBeenCalled();
  });

  it("updates the open window's limit and releases the usage-based-upgrade schedule on a genuine upgrade", async () => {
    resolveTeamMock.mockResolvedValue({ id: "team_1" });
    retrieveProductMock.mockResolvedValue(product("prod_1", "5000"));
    const endAt = oneHourFromNow();
    const { client, update, updateEqFirst, updateEqSecond, updateEqThird } =
      supabaseServiceRole({
        window: usageWindowRow({ limit: 1000, endAt }),
      });

    await syncTeamUsageLimitOnUpgrade(
      subscription({ customerId: "cus_42" }),
      client,
    );

    expect(update).toHaveBeenCalledWith({ limit: 5000 });
    expect(updateEqFirst).toHaveBeenCalledWith("team_id", "team_1");
    expect(updateEqSecond).toHaveBeenCalledWith(
      "start_at",
      "2026-08-01T00:00:00.000Z",
    );
    expect(updateEqThird).toHaveBeenCalledWith("end_at", endAt);

    expect(releaseSchedulesForCustomerMock).toHaveBeenCalledTimes(1);
    expect(releaseSchedulesForCustomerMock).toHaveBeenCalledWith({
      stripeCustomerId: "cus_42",
      criteria: { mode: "matching", type: "usage_based_upgrade" },
    });
  });

  it("resolves the limit from whichever line item carries valid social_post_limit metadata", async () => {
    resolveTeamMock.mockResolvedValue({ id: "team_1" });
    retrieveProductMock
      .mockResolvedValueOnce(product("prod_addon"))
      .mockResolvedValueOnce(product("prod_plan", "5000"));

    const multiItemSubscription = {
      customer: "cus_1",
      items: {
        data: [
          { price: { product: "prod_addon" } },
          { price: { product: "prod_plan" } },
        ],
      },
    } as never;

    const { client, update } = supabaseServiceRole({
      window: usageWindowRow({ limit: 1000, endAt: oneHourFromNow() }),
    });

    await syncTeamUsageLimitOnUpgrade(multiItemSubscription, client);

    expect(update).toHaveBeenCalledWith({ limit: 5000 });
  });
});
