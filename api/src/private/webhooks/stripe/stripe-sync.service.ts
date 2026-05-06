import { Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type Stripe from 'stripe';

import type Database from '../../../kysely/types/Database';
import type { CustomersId } from '../../../kysely/types/stripe/Customers';
import type { ProductsId } from '../../../kysely/types/stripe/Products';
import type { PricesId } from '../../../kysely/types/stripe/Prices';
import type { SubscriptionsId } from '../../../kysely/types/stripe/Subscriptions';
import type { SubscriptionItemsId } from '../../../kysely/types/stripe/SubscriptionItems';
import type { InvoicesId } from '../../../kysely/types/stripe/Invoices';
import type { ChargesId } from '../../../kysely/types/stripe/Charges';
import type { MetersId } from '../../../kysely/types/stripe/Meters';
import type { SubscriptionSchedulesId } from '../../../kysely/types/stripe/SubscriptionSchedules';
import type {
  MeterEventsEventName,
  MeterEventsIdentifier,
} from '../../../kysely/types/stripe/MeterEvents';

type SyncDb = Kysely<Database>;

/**
 * Maps Stripe entities into the `stripe` postgres schema. Used by both the
 * webhook handler (single object) and the manual sync CLI (bulk pagination).
 *
 * Each upsert lands the full Stripe object in `data jsonb` plus a handful of
 * promoted columns we want to query / index on without unwrapping JSON.
 *
 * Writes go through Kysely (not supabase-js) because the `stripe` schema
 * isn't exposed via PostgREST and we want loud failures when something is
 * misconfigured — Kysely throws on errors by default.
 */
@Injectable()
export class StripeSyncService {
  private fromSec(seconds: number | null | undefined): Date | null {
    if (!seconds) return null;
    return new Date(seconds * 1000);
  }

  private toJsonb(value: unknown): string {
    return JSON.stringify(value ?? null);
  }

  private toBigintStr(n: number | null | undefined): string | null {
    return n == null ? null : String(n);
  }

  async upsertCustomer(
    db: SyncDb,
    customer: Stripe.Customer | Stripe.DeletedCustomer,
  ): Promise<void> {
    if ((customer as Stripe.DeletedCustomer).deleted) {
      await db
        .updateTable('stripe.customers')
        .set({ deleted_at: new Date() })
        .where('id', '=', customer.id as CustomersId)
        .execute();
      return;
    }
    const c = customer as Stripe.Customer;
    const now = new Date();
    await db
      .insertInto('stripe.customers')
      .values({
        id: c.id as CustomersId,
        email: c.email,
        name: c.name,
        description: c.description,
        currency: c.currency,
        delinquent: c.delinquent ?? null,
        metadata: this.toJsonb(c.metadata ?? {}),
        stripe_created: this.fromSec(c.created),
        livemode: c.livemode,
        data: this.toJsonb(c),
        synced_at: now,
        deleted_at: null,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          email: c.email,
          name: c.name,
          description: c.description,
          currency: c.currency,
          delinquent: c.delinquent ?? null,
          metadata: this.toJsonb(c.metadata ?? {}),
          stripe_created: this.fromSec(c.created),
          livemode: c.livemode,
          data: this.toJsonb(c),
          synced_at: now,
          deleted_at: null,
        }),
      )
      .execute();
  }

  async upsertProduct(db: SyncDb, product: Stripe.Product): Promise<void> {
    if (product.deleted) {
      await db
        .updateTable('stripe.products')
        .set({ deleted_at: new Date() })
        .where('id', '=', product.id as ProductsId)
        .execute();
      return;
    }
    const now = new Date();
    const row = {
      active: product.active,
      name: product.name,
      description: product.description,
      metadata: this.toJsonb(product.metadata ?? {}),
      stripe_created: this.fromSec(product.created),
      livemode: product.livemode,
      data: this.toJsonb(product),
      synced_at: now,
      deleted_at: null,
    };
    await db
      .insertInto('stripe.products')
      .values({ id: product.id as ProductsId, ...row })
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async upsertPrice(db: SyncDb, price: Stripe.Price): Promise<void> {
    if (price.deleted) {
      await db
        .updateTable('stripe.prices')
        .set({ deleted_at: new Date() })
        .where('id', '=', price.id as PricesId)
        .execute();
      return;
    }
    const productId =
      typeof price.product === 'string' ? price.product : price.product?.id;
    const now = new Date();
    const row = {
      product_id: productId ?? null,
      active: price.active,
      currency: price.currency,
      unit_amount: this.toBigintStr(price.unit_amount),
      type: price.type,
      recurring_interval: price.recurring?.interval ?? null,
      recurring_interval_count: price.recurring?.interval_count ?? null,
      nickname: price.nickname,
      metadata: this.toJsonb(price.metadata ?? {}),
      stripe_created: this.fromSec(price.created),
      livemode: price.livemode,
      data: this.toJsonb(price),
      synced_at: now,
      deleted_at: null,
    };
    await db
      .insertInto('stripe.prices')
      .values({ id: price.id as PricesId, ...row })
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async upsertSubscription(
    db: SyncDb,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer?.id ?? null);
    const now = new Date();
    const row = {
      customer_id: customerId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: this.fromSec(
        (subscription as unknown as { current_period_start?: number })
          .current_period_start,
      ),
      current_period_end: this.fromSec(
        (subscription as unknown as { current_period_end?: number })
          .current_period_end,
      ),
      cancel_at: this.fromSec(subscription.cancel_at),
      canceled_at: this.fromSec(subscription.canceled_at),
      ended_at: this.fromSec(subscription.ended_at),
      trial_start: this.fromSec(subscription.trial_start),
      trial_end: this.fromSec(subscription.trial_end),
      collection_method: subscription.collection_method,
      currency: subscription.currency,
      metadata: this.toJsonb(subscription.metadata ?? {}),
      stripe_created: this.fromSec(subscription.created),
      livemode: subscription.livemode,
      data: this.toJsonb(subscription),
      synced_at: now,
      deleted_at: null,
    };
    const items = subscription.items?.data ?? [];
    const itemIds = items.map((i) => i.id);

    // Subscription + its items are reconciled atomically: an item that was
    // removed in Stripe must disappear locally, otherwise the mirror lies
    // about what's currently billable.
    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto('stripe.subscriptions')
        .values({ id: subscription.id as SubscriptionsId, ...row })
        .onConflict((oc) => oc.column('id').doUpdateSet(row))
        .execute();

      let deleteQuery = trx
        .deleteFrom('stripe.subscription_items')
        .where('subscription_id', '=', subscription.id);
      if (itemIds.length > 0) {
        deleteQuery = deleteQuery.where(
          'id',
          'not in',
          itemIds as SubscriptionItemsId[],
        );
      }
      await deleteQuery.execute();

      for (const item of items) {
        const itemRow = {
          subscription_id: subscription.id,
          price_id: item.price?.id ?? null,
          quantity: this.toBigintStr(item.quantity),
          metadata: this.toJsonb(item.metadata ?? {}),
          stripe_created: this.fromSec(item.created),
          data: this.toJsonb(item),
          synced_at: now,
        };
        await trx
          .insertInto('stripe.subscription_items')
          .values({ id: item.id as SubscriptionItemsId, ...itemRow })
          .onConflict((oc) => oc.column('id').doUpdateSet(itemRow))
          .execute();
      }
    });
  }

  async upsertInvoice(db: SyncDb, invoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer?.id ?? null);
    const invoiceSubscription = (
      invoice as unknown as {
        subscription?: string | { id?: string } | null;
      }
    ).subscription;
    const subscriptionId =
      typeof invoiceSubscription === 'string'
        ? invoiceSubscription
        : (invoiceSubscription?.id ?? null);
    const statusTransitions = (
      invoice as unknown as {
        status_transitions?: { paid_at?: number };
      }
    ).status_transitions;
    const now = new Date();
    const row = {
      customer_id: customerId,
      subscription_id: subscriptionId,
      status: invoice.status,
      number: invoice.number,
      currency: invoice.currency,
      amount_due: this.toBigintStr(invoice.amount_due),
      amount_paid: this.toBigintStr(invoice.amount_paid),
      amount_remaining: this.toBigintStr(invoice.amount_remaining),
      total: this.toBigintStr(invoice.total),
      subtotal: this.toBigintStr(invoice.subtotal),
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      due_date: this.fromSec(invoice.due_date),
      paid_at: this.fromSec(statusTransitions?.paid_at),
      period_start: this.fromSec(invoice.period_start),
      period_end: this.fromSec(invoice.period_end),
      collection_method: invoice.collection_method,
      metadata: this.toJsonb(invoice.metadata ?? {}),
      stripe_created: this.fromSec(invoice.created),
      livemode: invoice.livemode,
      data: this.toJsonb(invoice),
      synced_at: now,
      deleted_at: null,
    };
    await db
      .insertInto('stripe.invoices')
      .values({ id: invoice.id! as InvoicesId, ...row })
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async upsertCharge(db: SyncDb, charge: Stripe.Charge): Promise<void> {
    const customerId =
      typeof charge.customer === 'string'
        ? charge.customer
        : (charge.customer?.id ?? null);
    const chargeInvoice = (
      charge as unknown as {
        invoice?: string | { id?: string } | null;
      }
    ).invoice;
    const invoiceId =
      typeof chargeInvoice === 'string'
        ? chargeInvoice
        : (chargeInvoice?.id ?? null);
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : (charge.payment_intent?.id ?? null);
    const now = new Date();
    const row = {
      customer_id: customerId,
      invoice_id: invoiceId,
      payment_intent_id: paymentIntentId,
      status: charge.status,
      amount: this.toBigintStr(charge.amount),
      amount_captured: this.toBigintStr(charge.amount_captured),
      amount_refunded: this.toBigintStr(charge.amount_refunded),
      currency: charge.currency,
      paid: charge.paid,
      refunded: charge.refunded,
      captured: charge.captured,
      receipt_url: charge.receipt_url,
      failure_code: charge.failure_code,
      failure_message: charge.failure_message,
      metadata: this.toJsonb(charge.metadata ?? {}),
      stripe_created: this.fromSec(charge.created),
      livemode: charge.livemode,
      data: this.toJsonb(charge),
      synced_at: now,
      deleted_at: null,
    };
    await db
      .insertInto('stripe.charges')
      .values({ id: charge.id as ChargesId, ...row })
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async upsertMeter(db: SyncDb, meter: Stripe.Billing.Meter): Promise<void> {
    const isDeactivated = meter.status === 'inactive';
    const now = new Date();
    const row = {
      display_name: meter.display_name,
      event_name: meter.event_name,
      status: meter.status,
      event_time_window: meter.event_time_window,
      customer_mapping: this.toJsonb(meter.customer_mapping ?? {}),
      default_aggregation: this.toJsonb(meter.default_aggregation ?? {}),
      value_settings: this.toJsonb(meter.value_settings ?? {}),
      stripe_created: this.fromSec(meter.created),
      stripe_updated: this.fromSec(
        (meter as unknown as { updated?: number }).updated,
      ),
      livemode: meter.livemode,
      data: this.toJsonb(meter),
      synced_at: now,
      deleted_at: isDeactivated ? now : null,
    };
    await db
      .insertInto('stripe.meters')
      .values({ id: meter.id as MetersId, ...row })
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async upsertMeterEvent(
    db: SyncDb,
    meterEvent: Stripe.Billing.MeterEvent,
  ): Promise<void> {
    const payload = (meterEvent.payload ?? {}) as Record<string, string>;
    const customerId = payload.stripe_customer_id ?? null;
    const rawValue = payload.value;
    const numericValue =
      rawValue !== undefined && rawValue !== null && rawValue !== ''
        ? Number(rawValue)
        : null;
    const now = new Date();
    const row = {
      customer_id: customerId,
      value: this.toBigintStr(
        numericValue !== null && Number.isFinite(numericValue)
          ? numericValue
          : null,
      ),
      payload: this.toJsonb(payload),
      event_timestamp: this.fromSec(meterEvent.timestamp)!,
      stripe_created: this.fromSec(meterEvent.created),
      livemode: meterEvent.livemode,
      data: this.toJsonb(meterEvent),
      synced_at: now,
    };
    await db
      .insertInto('stripe.meter_events')
      .values({
        event_name: meterEvent.event_name as MeterEventsEventName,
        identifier: meterEvent.identifier as MeterEventsIdentifier,
        ...row,
      })
      .onConflict((oc) =>
        oc.columns(['event_name', 'identifier']).doUpdateSet(row),
      )
      .execute();
  }

  async upsertSubscriptionSchedule(
    db: SyncDb,
    schedule: Stripe.SubscriptionSchedule,
  ): Promise<void> {
    const customerId =
      typeof schedule.customer === 'string'
        ? schedule.customer
        : (schedule.customer?.id ?? null);
    const subscriptionId =
      typeof schedule.subscription === 'string'
        ? schedule.subscription
        : (schedule.subscription?.id ?? null);
    const releasedSubscriptionId =
      typeof schedule.released_subscription === 'string'
        ? schedule.released_subscription
        : null;
    const now = new Date();
    const row = {
      customer_id: customerId,
      subscription_id: subscriptionId,
      status: schedule.status,
      end_behavior: schedule.end_behavior,
      current_phase_start: this.fromSec(schedule.current_phase?.start_date),
      current_phase_end: this.fromSec(schedule.current_phase?.end_date),
      released_at: this.fromSec(schedule.released_at),
      canceled_at: this.fromSec(schedule.canceled_at),
      completed_at: this.fromSec(schedule.completed_at),
      released_subscription_id: releasedSubscriptionId,
      metadata: this.toJsonb(schedule.metadata ?? {}),
      stripe_created: this.fromSec(schedule.created),
      livemode: schedule.livemode,
      data: this.toJsonb(schedule),
      synced_at: now,
    };
    await db
      .insertInto('stripe.subscription_schedules')
      .values({ id: schedule.id as SubscriptionSchedulesId, ...row })
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async applyEvent(db: SyncDb, event: Stripe.Event): Promise<void> {
    const obj = event.data.object as { object?: string };
    switch (obj.object) {
      case 'customer':
        await this.upsertCustomer(
          db,
          event.data.object as Stripe.Customer | Stripe.DeletedCustomer,
        );
        break;
      case 'product':
        await this.upsertProduct(db, event.data.object as Stripe.Product);
        break;
      case 'price':
        await this.upsertPrice(db, event.data.object as Stripe.Price);
        break;
      case 'subscription':
        await this.upsertSubscription(
          db,
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'subscription_schedule':
        await this.upsertSubscriptionSchedule(
          db,
          event.data.object as Stripe.SubscriptionSchedule,
        );
        break;
      case 'invoice':
        await this.upsertInvoice(db, event.data.object as Stripe.Invoice);
        break;
      case 'charge':
        await this.upsertCharge(db, event.data.object as Stripe.Charge);
        break;
      case 'billing.meter':
        await this.upsertMeter(db, event.data.object as Stripe.Billing.Meter);
        break;
      case 'billing.meter_event':
        await this.upsertMeterEvent(
          db,
          event.data.object as unknown as Stripe.Billing.MeterEvent,
        );
        break;
      default:
        // No-op: events for objects we don't sync are still recorded in
        // stripe.events for auditing, but require no schema mutation.
        break;
    }
  }
}
