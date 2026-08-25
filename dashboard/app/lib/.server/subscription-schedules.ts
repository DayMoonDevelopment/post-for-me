import type Stripe from "stripe";

import { stripe } from "./stripe";

export const SCHEDULE_METADATA_KEY = "schedule_type";
// Keep in sync with trigger/process-usage-limits.ts — same key/values, so
// schedules created by either sibling stay mutually recognizable even
// though there's no shared package between them.
export const SCHEDULE_TYPE = {
  USAGE_BASED_UPGRADE: "usage_based_upgrade",
  ADDON_REMOVAL: "addon_removal",
} as const;
export type ScheduleType = (typeof SCHEDULE_TYPE)[keyof typeof SCHEDULE_TYPE];

export type ScheduleReleaseCriteria =
  | { mode: "all" }
  | { mode: "matching"; type: ScheduleType }
  | { mode: "excluding"; type: ScheduleType };

export async function releaseSchedulesForCustomer({
  stripeCustomerId,
  criteria,
}: {
  stripeCustomerId: string;
  criteria: ScheduleReleaseCriteria;
}): Promise<void> {
  const schedules = await stripe.subscriptionSchedules.list({
    customer: stripeCustomerId,
  });

  for (const schedule of schedules.data.filter((s) => s.status === "active")) {
    const type = schedule.metadata?.[SCHEDULE_METADATA_KEY];
    const matches = criteria.mode !== "all" && type === criteria.type;
    const shouldRelease =
      criteria.mode === "all" ||
      (criteria.mode === "matching" && matches) ||
      (criteria.mode === "excluding" && !matches);

    if (shouldRelease) {
      await stripe.subscriptionSchedules.release(schedule.id);
    }
  }
}

export function findScheduleOfType<
  T extends { metadata?: Stripe.Metadata | null },
>(schedules: T[], type: ScheduleType): T | undefined {
  return schedules.find((s) => s.metadata?.[SCHEDULE_METADATA_KEY] === type);
}
