import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.charges */
export type ChargesId = string & { __brand: 'stripe.charges' };

/** Represents the table stripe.charges */
export default interface ChargesTable {
  id: ColumnType<ChargesId, ChargesId, ChargesId>;

  customer_id: ColumnType<string | null, string | null, string | null>;

  invoice_id: ColumnType<string | null, string | null, string | null>;

  payment_intent_id: ColumnType<string | null, string | null, string | null>;

  status: ColumnType<string | null, string | null, string | null>;

  amount: ColumnType<string | null, string | null, string | null>;

  amount_captured: ColumnType<string | null, string | null, string | null>;

  amount_refunded: ColumnType<string | null, string | null, string | null>;

  currency: ColumnType<string | null, string | null, string | null>;

  paid: ColumnType<boolean | null, boolean | null, boolean | null>;

  refunded: ColumnType<boolean | null, boolean | null, boolean | null>;

  captured: ColumnType<boolean | null, boolean | null, boolean | null>;

  receipt_url: ColumnType<string | null, string | null, string | null>;

  failure_code: ColumnType<string | null, string | null, string | null>;

  failure_message: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Charges = Selectable<ChargesTable>;

export type NewCharges = Insertable<ChargesTable>;

export type ChargesUpdate = Updateable<ChargesTable>;