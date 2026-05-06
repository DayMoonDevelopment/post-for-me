import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.subscription_schedules */
export type SubscriptionSchedulesId = string & { __brand: 'stripe.subscription_schedules' };

/** Represents the table stripe.subscription_schedules */
export default interface SubscriptionSchedulesTable {
  id: ColumnType<SubscriptionSchedulesId, SubscriptionSchedulesId, SubscriptionSchedulesId>;

  customer_id: ColumnType<string | null, string | null, string | null>;

  subscription_id: ColumnType<string | null, string | null, string | null>;

  status: ColumnType<string | null, string | null, string | null>;

  end_behavior: ColumnType<string | null, string | null, string | null>;

  current_phase_start: ColumnType<Date | null, Date | string | null, Date | string | null>;

  current_phase_end: ColumnType<Date | null, Date | string | null, Date | string | null>;

  released_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  canceled_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  completed_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  released_subscription_id: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type SubscriptionSchedules = Selectable<SubscriptionSchedulesTable>;

export type NewSubscriptionSchedules = Insertable<SubscriptionSchedulesTable>;

export type SubscriptionSchedulesUpdate = Updateable<SubscriptionSchedulesTable>;