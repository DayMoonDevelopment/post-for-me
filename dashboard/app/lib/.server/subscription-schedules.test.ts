import { describe, expect, it, vi, beforeEach } from "vitest";

const listMock = vi.fn();
const releaseMock = vi.fn();

vi.mock("./stripe", () => ({
  stripe: {
    subscriptionSchedules: {
      list: (...args: unknown[]) => listMock(...args),
      release: (...args: unknown[]) => releaseMock(...args),
    },
  },
}));

const { releaseSchedulesForCustomer, findScheduleOfType, SCHEDULE_TYPE } =
  await import("./subscription-schedules");

function schedule(id: string, status: string, type?: string) {
  return {
    id,
    status,
    metadata: (type ? { schedule_type: type } : {}) as Record<string, string>,
  };
}

beforeEach(() => {
  listMock.mockReset();
  releaseMock.mockReset();
});

describe("releaseSchedulesForCustomer", () => {
  it("mode: all releases every active schedule regardless of type", async () => {
    listMock.mockResolvedValue({
      data: [
        schedule("s1", "active", SCHEDULE_TYPE.USAGE_BASED_UPGRADE),
        schedule("s2", "active", SCHEDULE_TYPE.ADDON_REMOVAL),
        schedule("s3", "canceled", SCHEDULE_TYPE.ADDON_REMOVAL),
      ],
    });

    await releaseSchedulesForCustomer({
      stripeCustomerId: "cus_1",
      criteria: { mode: "all" },
    });

    expect(releaseMock).toHaveBeenCalledTimes(2);
    expect(releaseMock).toHaveBeenCalledWith("s1");
    expect(releaseMock).toHaveBeenCalledWith("s2");
  });

  it("mode: matching releases only schedules of the given type", async () => {
    listMock.mockResolvedValue({
      data: [
        schedule("s1", "active", SCHEDULE_TYPE.USAGE_BASED_UPGRADE),
        schedule("s2", "active", SCHEDULE_TYPE.ADDON_REMOVAL),
      ],
    });

    await releaseSchedulesForCustomer({
      stripeCustomerId: "cus_1",
      criteria: { mode: "matching", type: SCHEDULE_TYPE.ADDON_REMOVAL },
    });

    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).toHaveBeenCalledWith("s2");
  });

  it("mode: excluding releases every active schedule except the given type", async () => {
    listMock.mockResolvedValue({
      data: [
        schedule("s1", "active", SCHEDULE_TYPE.USAGE_BASED_UPGRADE),
        schedule("s2", "active", SCHEDULE_TYPE.ADDON_REMOVAL),
      ],
    });

    await releaseSchedulesForCustomer({
      stripeCustomerId: "cus_1",
      criteria: { mode: "excluding", type: SCHEDULE_TYPE.ADDON_REMOVAL },
    });

    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).toHaveBeenCalledWith("s1");
  });

  it("never releases a non-active schedule even in mode: all", async () => {
    listMock.mockResolvedValue({
      data: [schedule("s1", "released", SCHEDULE_TYPE.USAGE_BASED_UPGRADE)],
    });

    await releaseSchedulesForCustomer({
      stripeCustomerId: "cus_1",
      criteria: { mode: "all" },
    });

    expect(releaseMock).not.toHaveBeenCalled();
  });

  it("untagged schedules are never released by mode: matching", async () => {
    listMock.mockResolvedValue({
      data: [schedule("s1", "active")],
    });

    await releaseSchedulesForCustomer({
      stripeCustomerId: "cus_1",
      criteria: { mode: "matching", type: SCHEDULE_TYPE.ADDON_REMOVAL },
    });

    expect(releaseMock).not.toHaveBeenCalled();
  });
});

describe("findScheduleOfType", () => {
  it("finds the schedule matching the given type", () => {
    const schedules = [
      schedule("s1", "active", SCHEDULE_TYPE.USAGE_BASED_UPGRADE),
      schedule("s2", "active", SCHEDULE_TYPE.ADDON_REMOVAL),
    ];

    expect(findScheduleOfType(schedules, SCHEDULE_TYPE.ADDON_REMOVAL)?.id).toBe(
      "s2",
    );
  });

  it("returns undefined when no schedule matches", () => {
    const schedules = [schedule("s1", "active", SCHEDULE_TYPE.ADDON_REMOVAL)];

    expect(
      findScheduleOfType(schedules, SCHEDULE_TYPE.USAGE_BASED_UPGRADE),
    ).toBeUndefined();
  });
});
