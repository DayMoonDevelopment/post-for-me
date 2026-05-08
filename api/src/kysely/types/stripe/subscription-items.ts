import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.subscription_items */
export type SubscriptionItemsId = string & { __brand: 'stripe.subscription_items' };

/** Represents the table stripe.subscription_items */
export default interface SubscriptionItemsTable {
  id: ColumnType<SubscriptionItemsId, SubscriptionItemsId, SubscriptionItemsId>;

  subscription_id: ColumnType<string, string, string>;

  price_id: ColumnType<string | null, string | null, string | null>;

  quantity: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type SubscriptionItems = Selectable<SubscriptionItemsTable>;

export type NewSubscriptionItems = Insertable<SubscriptionItemsTable>;

export type SubscriptionItemsUpdate = Updateable<SubscriptionItemsTable>;