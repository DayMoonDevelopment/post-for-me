import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.meters */
export type MetersId = string & { __brand: 'stripe.meters' };

/** Represents the table stripe.meters */
export default interface MetersTable {
  id: ColumnType<MetersId, MetersId, MetersId>;

  display_name: ColumnType<string | null, string | null, string | null>;

  event_name: ColumnType<string, string, string>;

  status: ColumnType<string | null, string | null, string | null>;

  event_time_window: ColumnType<string | null, string | null, string | null>;

  customer_mapping: ColumnType<unknown | null, unknown | null, unknown | null>;

  default_aggregation: ColumnType<unknown | null, unknown | null, unknown | null>;

  value_settings: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  stripe_updated: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Meters = Selectable<MetersTable>;

export type NewMeters = Insertable<MetersTable>;

export type MetersUpdate = Updateable<MetersTable>;