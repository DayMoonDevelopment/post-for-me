import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.products */
export type ProductsId = string & { __brand: 'stripe.products' };

/** Represents the table stripe.products */
export default interface ProductsTable {
  id: ColumnType<ProductsId, ProductsId, ProductsId>;

  active: ColumnType<boolean | null, boolean | null, boolean | null>;

  name: ColumnType<string | null, string | null, string | null>;

  description: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Products = Selectable<ProductsTable>;

export type NewProducts = Insertable<ProductsTable>;

export type ProductsUpdate = Updateable<ProductsTable>;