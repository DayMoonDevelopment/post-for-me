import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.prices */
export type PricesId = string & { __brand: 'stripe.prices' };

/** Represents the table stripe.prices */
export default interface PricesTable {
  id: ColumnType<PricesId, PricesId, PricesId>;

  product_id: ColumnType<string | null, string | null, string | null>;

  active: ColumnType<boolean | null, boolean | null, boolean | null>;

  currency: ColumnType<string | null, string | null, string | null>;

  unit_amount: ColumnType<string | null, string | null, string | null>;

  type: ColumnType<string | null, string | null, string | null>;

  recurring_interval: ColumnType<string | null, string | null, string | null>;

  recurring_interval_count: ColumnType<number | null, number | null, number | null>;

  nickname: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Prices = Selectable<PricesTable>;

export type NewPrices = Insertable<PricesTable>;

export type PricesUpdate = Updateable<PricesTable>;