import type { ColumnType } from 'kysely';

/**
 * Database type for Kysely. Currently only mirrors tables in the `stripe`
 * postgres schema — public-schema access still goes through Supabase. As
 * other areas migrate to Kysely, extend this interface with their tables.
 *
 * Schema-qualified table names (e.g. `stripe.customers`) are used as the
 * keys so queries read `db.insertInto('stripe.customers')`.
 */

type JsonbReadable = unknown;
/** jsonb columns are written as a JSON-stringified value (Postgres coerces). */
type JsonbWritable = string;
type JsonbColumn = ColumnType<JsonbReadable, JsonbWritable, JsonbWritable>;

type TimestampWritable = Date | string;
type Timestamptz = ColumnType<Date, TimestampWritable, TimestampWritable>;
type TimestamptzNullable = ColumnType<
  Date | null,
  TimestampWritable | null,
  TimestampWritable | null
>;
type TimestamptzDefault = ColumnType<
  Date,
  TimestampWritable | undefined,
  TimestampWritable
>;

interface StripeEventsTable {
  id: string;
  type: string;
  api_version: string | null;
  livemode: boolean | null;
  request_id: string | null;
  idempotency_key: string | null;
  stripe_created: TimestamptzNullable;
  received_at: TimestamptzDefault;
  processed_at: TimestamptzNullable;
  error: string | null;
  data: JsonbColumn;
}

interface StripeCustomersTable {
  id: string;
  email: string | null;
  name: string | null;
  description: string | null;
  currency: string | null;
  delinquent: boolean | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripeProductsTable {
  id: string;
  active: boolean | null;
  name: string | null;
  description: string | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripePricesTable {
  id: string;
  product_id: string | null;
  active: boolean | null;
  currency: string | null;
  unit_amount: number | null;
  type: string | null;
  recurring_interval: string | null;
  recurring_interval_count: number | null;
  nickname: string | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripeSubscriptionsTable {
  id: string;
  customer_id: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_start: TimestamptzNullable;
  current_period_end: TimestamptzNullable;
  cancel_at: TimestamptzNullable;
  canceled_at: TimestamptzNullable;
  ended_at: TimestamptzNullable;
  trial_start: TimestamptzNullable;
  trial_end: TimestamptzNullable;
  collection_method: string | null;
  currency: string | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripeSubscriptionItemsTable {
  id: string;
  subscription_id: string;
  price_id: string | null;
  quantity: number | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  data: JsonbColumn;
  synced_at: Timestamptz;
}

interface StripeInvoicesTable {
  id: string;
  customer_id: string | null;
  subscription_id: string | null;
  status: string | null;
  number: string | null;
  currency: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  amount_remaining: number | null;
  total: number | null;
  subtotal: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  due_date: TimestamptzNullable;
  paid_at: TimestamptzNullable;
  period_start: TimestamptzNullable;
  period_end: TimestamptzNullable;
  collection_method: string | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripeChargesTable {
  id: string;
  customer_id: string | null;
  invoice_id: string | null;
  payment_intent_id: string | null;
  status: string | null;
  amount: number | null;
  amount_captured: number | null;
  amount_refunded: number | null;
  currency: string | null;
  paid: boolean | null;
  refunded: boolean | null;
  captured: boolean | null;
  receipt_url: string | null;
  failure_code: string | null;
  failure_message: string | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripeMetersTable {
  id: string;
  display_name: string | null;
  event_name: string;
  status: string | null;
  event_time_window: string | null;
  customer_mapping: JsonbColumn;
  default_aggregation: JsonbColumn;
  value_settings: JsonbColumn;
  stripe_created: TimestamptzNullable;
  stripe_updated: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
  deleted_at: TimestamptzNullable;
}

interface StripeMeterEventsTable {
  event_name: string;
  identifier: string;
  customer_id: string | null;
  value: number | null;
  payload: JsonbColumn;
  event_timestamp: Timestamptz;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
}

interface StripeSubscriptionSchedulesTable {
  id: string;
  customer_id: string | null;
  subscription_id: string | null;
  status: string | null;
  end_behavior: string | null;
  current_phase_start: TimestamptzNullable;
  current_phase_end: TimestamptzNullable;
  released_at: TimestamptzNullable;
  canceled_at: TimestamptzNullable;
  completed_at: TimestamptzNullable;
  released_subscription_id: string | null;
  metadata: JsonbColumn;
  stripe_created: TimestamptzNullable;
  livemode: boolean | null;
  data: JsonbColumn;
  synced_at: Timestamptz;
}

export interface Database {
  'stripe.events': StripeEventsTable;
  'stripe.customers': StripeCustomersTable;
  'stripe.products': StripeProductsTable;
  'stripe.prices': StripePricesTable;
  'stripe.subscriptions': StripeSubscriptionsTable;
  'stripe.subscription_items': StripeSubscriptionItemsTable;
  'stripe.invoices': StripeInvoicesTable;
  'stripe.charges': StripeChargesTable;
  'stripe.meters': StripeMetersTable;
  'stripe.meter_events': StripeMeterEventsTable;
  'stripe.subscription_schedules': StripeSubscriptionSchedulesTable;
}
