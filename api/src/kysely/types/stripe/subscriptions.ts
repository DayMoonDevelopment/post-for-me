import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.subscriptions */
export type SubscriptionsId = string & { __brand: 'stripe.subscriptions' };

/** Represents the table stripe.subscriptions */
export default interface SubscriptionsTable {
  id: ColumnType<SubscriptionsId, SubscriptionsId, SubscriptionsId>;

  customer_id: ColumnType<string | null, string | null, string | null>;

  status: ColumnType<string | null, string | null, string | null>;

  cancel_at_period_end: ColumnType<boolean | null, boolean | null, boolean | null>;

  current_period_start: ColumnType<Date | null, Date | string | null, Date | string | null>;

  current_period_end: ColumnType<Date | null, Date | string | null, Date | string | null>;

  cancel_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  canceled_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  ended_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  trial_start: ColumnType<Date | null, Date | string | null, Date | string | null>;

  trial_end: ColumnType<Date | null, Date | string | null, Date | string | null>;

  collection_method: ColumnType<string | null, string | null, string | null>;

  currency: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Subscriptions = Selectable<SubscriptionsTable>;

export type NewSubscriptions = Insertable<SubscriptionsTable>;

export type SubscriptionsUpdate = Updateable<SubscriptionsTable>;