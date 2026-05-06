import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.customers */
export type CustomersId = string & { __brand: 'stripe.customers' };

/** Represents the table stripe.customers */
export default interface CustomersTable {
  id: ColumnType<CustomersId, CustomersId, CustomersId>;

  email: ColumnType<string | null, string | null, string | null>;

  name: ColumnType<string | null, string | null, string | null>;

  description: ColumnType<string | null, string | null, string | null>;

  currency: ColumnType<string | null, string | null, string | null>;

  delinquent: ColumnType<boolean | null, boolean | null, boolean | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Customers = Selectable<CustomersTable>;

export type NewCustomers = Insertable<CustomersTable>;

export type CustomersUpdate = Updateable<CustomersTable>;