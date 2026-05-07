import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

/** Identifier type for stripe.invoices */
export type InvoicesId = string & { __brand: 'stripe.invoices' };

/** Represents the table stripe.invoices */
export default interface InvoicesTable {
  id: ColumnType<InvoicesId, InvoicesId, InvoicesId>;

  customer_id: ColumnType<string | null, string | null, string | null>;

  subscription_id: ColumnType<string | null, string | null, string | null>;

  status: ColumnType<string | null, string | null, string | null>;

  number: ColumnType<string | null, string | null, string | null>;

  currency: ColumnType<string | null, string | null, string | null>;

  amount_due: ColumnType<string | null, string | null, string | null>;

  amount_paid: ColumnType<string | null, string | null, string | null>;

  amount_remaining: ColumnType<string | null, string | null, string | null>;

  total: ColumnType<string | null, string | null, string | null>;

  subtotal: ColumnType<string | null, string | null, string | null>;

  hosted_invoice_url: ColumnType<string | null, string | null, string | null>;

  invoice_pdf: ColumnType<string | null, string | null, string | null>;

  due_date: ColumnType<Date | null, Date | string | null, Date | string | null>;

  paid_at: ColumnType<Date | null, Date | string | null, Date | string | null>;

  period_start: ColumnType<Date | null, Date | string | null, Date | string | null>;

  period_end: ColumnType<Date | null, Date | string | null, Date | string | null>;

  collection_method: ColumnType<string | null, string | null, string | null>;

  metadata: ColumnType<unknown | null, unknown | null, unknown | null>;

  stripe_created: ColumnType<Date | null, Date | string | null, Date | string | null>;

  livemode: ColumnType<boolean | null, boolean | null, boolean | null>;

  data: ColumnType<unknown, unknown, unknown>;

  synced_at: ColumnType<Date, Date | string | undefined, Date | string>;

  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type Invoices = Selectable<InvoicesTable>;

export type NewInvoices = Insertable<InvoicesTable>;

export type InvoicesUpdate = Updateable<InvoicesTable>;