import type { default as SubscriptionItemsTable } from './SubscriptionItems';
import type { default as SubscriptionSchedulesTable } from './SubscriptionSchedules';
import type { default as InvoicesTable } from './Invoices';
import type { default as ProductsTable } from './Products';
import type { default as PricesTable } from './Prices';
import type { default as ChargesTable } from './Charges';
import type { default as MetersTable } from './Meters';
import type { default as CustomersTable } from './Customers';
import type { default as MeterEventsTable } from './MeterEvents';
import type { default as SubscriptionsTable } from './Subscriptions';

export default interface StripeSchema {
  'stripe.subscription_items': SubscriptionItemsTable;

  'stripe.subscription_schedules': SubscriptionSchedulesTable;

  'stripe.invoices': InvoicesTable;

  'stripe.products': ProductsTable;

  'stripe.prices': PricesTable;

  'stripe.charges': ChargesTable;

  'stripe.meters': MetersTable;

  'stripe.customers': CustomersTable;

  'stripe.meter_events': MeterEventsTable;

  'stripe.subscriptions': SubscriptionsTable;
}