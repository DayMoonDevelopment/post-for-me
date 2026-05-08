import type { default as SubscriptionItemsTable } from './subscription-items';
import type { default as SubscriptionSchedulesTable } from './subscription-schedules';
import type { default as InvoicesTable } from './invoices';
import type { default as ProductsTable } from './products';
import type { default as PricesTable } from './prices';
import type { default as ChargesTable } from './charges';
import type { default as MetersTable } from './meters';
import type { default as CustomersTable } from './customers';
import type { default as SubscriptionsTable } from './subscriptions';

export default interface StripeSchema {
  'stripe.subscription_items': SubscriptionItemsTable;

  'stripe.subscription_schedules': SubscriptionSchedulesTable;

  'stripe.invoices': InvoicesTable;

  'stripe.products': ProductsTable;

  'stripe.prices': PricesTable;

  'stripe.charges': ChargesTable;

  'stripe.meters': MetersTable;

  'stripe.customers': CustomersTable;

  'stripe.subscriptions': SubscriptionsTable;
}