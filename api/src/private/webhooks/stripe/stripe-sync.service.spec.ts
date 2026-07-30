import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createKyselyDbMock } from '../../../test-utils/kysely-mock';
import { StripeSyncService } from './stripe-sync.service';

function anyDate(): Date {
  return expect.any(Date) as Date;
}

describe('StripeSyncService', () => {
  let service: StripeSyncService;

  beforeEach(() => {
    service = new StripeSyncService();
  });

  describe('applyEvent', () => {
    const cases: [string, keyof StripeSyncService][] = [
      ['customer', 'upsertCustomer'],
      ['product', 'upsertProduct'],
      ['price', 'upsertPrice'],
      ['subscription', 'upsertSubscription'],
      ['subscription_schedule', 'upsertSubscriptionSchedule'],
      ['invoice', 'upsertInvoice'],
      ['charge', 'upsertCharge'],
      ['billing.meter', 'upsertMeter'],
    ];

    it.each(cases)(
      'routes a %s object to %s',
      async (objectType, methodName) => {
        const db = createKyselyDbMock() as unknown as Parameters<
          StripeSyncService['applyEvent']
        >[0];
        const spy = vi
          .spyOn(service, methodName as 'upsertCustomer')
          .mockResolvedValue(undefined);
        const obj = { object: objectType, id: 'obj_1' };
        const event = {
          data: { object: obj },
        } as unknown as Stripe.Event;

        await service.applyEvent(db, event);

        expect(spy).toHaveBeenCalledWith(db, obj);
      },
    );

    it('no-ops for an unrecognized object type', async () => {
      const db = createKyselyDbMock();
      const event = {
        data: { object: { object: 'balance_transaction' } },
      } as unknown as Stripe.Event;

      await expect(
        service.applyEvent(
          db as unknown as Parameters<StripeSyncService['applyEvent']>[0],
          event,
        ),
      ).resolves.toBeUndefined();
      expect(db.insertInto).not.toHaveBeenCalled();
      expect(db.updateTable).not.toHaveBeenCalled();
    });
  });

  describe('upsertCustomer', () => {
    it('inserts an active customer', async () => {
      const db = createKyselyDbMock();
      const customer = {
        id: 'cus_1',
        email: 'a@example.com',
        name: 'Alice',
        description: null,
        currency: 'usd',
        delinquent: false,
        metadata: {},
        created: 1_700_000_000,
        livemode: false,
      } as unknown as Stripe.Customer;

      await service.upsertCustomer(
        db as unknown as Parameters<StripeSyncService['upsertCustomer']>[0],
        customer,
      );

      expect(db.insertInto).toHaveBeenCalledWith('stripe.customers');
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cus_1', email: 'a@example.com' }),
      );
      expect(db.updateTable).not.toHaveBeenCalled();
    });

    it('marks a deleted customer as deleted instead of inserting', async () => {
      const db = createKyselyDbMock();
      const deletedCustomer = {
        id: 'cus_2',
        deleted: true,
      } as unknown as Stripe.DeletedCustomer;

      await service.upsertCustomer(
        db as unknown as Parameters<StripeSyncService['upsertCustomer']>[0],
        deletedCustomer,
      );

      expect(db.updateTable).toHaveBeenCalledWith('stripe.customers');
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: anyDate() }),
      );
      expect(db.where).toHaveBeenCalledWith('id', '=', 'cus_2');
      expect(db.insertInto).not.toHaveBeenCalled();
    });
  });

  describe('upsertPrice', () => {
    it('inserts an active price', async () => {
      const db = createKyselyDbMock();
      const price = {
        id: 'price_1',
        deleted: false,
        product: 'prod_1',
        active: true,
        currency: 'usd',
        unit_amount: 1000,
        type: 'recurring',
        recurring: { interval: 'month', interval_count: 1 },
        nickname: null,
        metadata: {},
        created: 1_700_000_000,
        livemode: false,
      } as unknown as Stripe.Price;

      await service.upsertPrice(
        db as unknown as Parameters<StripeSyncService['upsertPrice']>[0],
        price,
      );

      expect(db.insertInto).toHaveBeenCalledWith('stripe.prices');
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'price_1',
          product_id: 'prod_1',
          recurring_interval: 'month',
        }),
      );
    });

    it('marks a deleted price as deleted instead of inserting', async () => {
      const db = createKyselyDbMock();
      const price = { id: 'price_2', deleted: true } as unknown as Stripe.Price;

      await service.upsertPrice(
        db as unknown as Parameters<StripeSyncService['upsertPrice']>[0],
        price,
      );

      expect(db.updateTable).toHaveBeenCalledWith('stripe.prices');
      expect(db.where).toHaveBeenCalledWith('id', '=', 'price_2');
      expect(db.insertInto).not.toHaveBeenCalled();
    });
  });

  describe('upsertInvoice', () => {
    it('skips invoices with no id (e.g. upcoming invoice previews)', async () => {
      const db = createKyselyDbMock();
      const invoice = { id: null } as unknown as Stripe.Invoice;

      await service.upsertInvoice(
        db as unknown as Parameters<StripeSyncService['upsertInvoice']>[0],
        invoice,
      );

      expect(db.insertInto).not.toHaveBeenCalled();
    });

    it('inserts an invoice and extracts customer/subscription ids', async () => {
      const db = createKyselyDbMock();
      const invoice = {
        id: 'in_1',
        customer: 'cus_1',
        subscription: 'sub_1',
        status: 'paid',
        number: 'INV-001',
        currency: 'usd',
        amount_due: 0,
        amount_paid: 1000,
        amount_remaining: 0,
        total: 1000,
        subtotal: 1000,
        hosted_invoice_url: null,
        invoice_pdf: null,
        due_date: null,
        status_transitions: { paid_at: 1_700_000_100 },
        period_start: 1_700_000_000,
        period_end: 1_702_592_000,
        collection_method: 'charge_automatically',
        metadata: {},
        created: 1_700_000_000,
        livemode: false,
      } as unknown as Stripe.Invoice;

      await service.upsertInvoice(
        db as unknown as Parameters<StripeSyncService['upsertInvoice']>[0],
        invoice,
      );

      expect(db.insertInto).toHaveBeenCalledWith('stripe.invoices');
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'in_1',
          customer_id: 'cus_1',
          subscription_id: 'sub_1',
        }),
      );
    });
  });

  describe('upsertSubscription', () => {
    const subscription = {
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      ended_at: null,
      trial_start: null,
      trial_end: null,
      collection_method: 'charge_automatically',
      currency: 'usd',
      metadata: {},
      created: 1_700_000_000,
      livemode: false,
      items: {
        data: [
          {
            id: 'si_1',
            price: { id: 'price_1' },
            quantity: 1,
            metadata: {},
            created: 1_700_000_000,
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_592_000,
          },
        ],
      },
    } as unknown as Stripe.Subscription;

    it('upserts the subscription and its items inside a transaction', async () => {
      const db = createKyselyDbMock();

      await service.upsertSubscription(
        db as unknown as Parameters<StripeSyncService['upsertSubscription']>[0],
        subscription,
      );

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(db.insertInto).toHaveBeenCalledWith('stripe.subscriptions');
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sub_1', customer_id: 'cus_1' }),
      );
      expect(db.insertInto).toHaveBeenCalledWith('stripe.subscription_items');
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'si_1', price_id: 'price_1' }),
      );
    });

    it('reads the billing period from the first subscription item, not the legacy top-level field', async () => {
      const db = createKyselyDbMock();

      await service.upsertSubscription(
        db as unknown as Parameters<StripeSyncService['upsertSubscription']>[0],
        subscription,
      );

      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          current_period_start: new Date(1_700_000_000 * 1000),
          current_period_end: new Date(1_702_592_000 * 1000),
        }),
      );
    });

    it('deletes items no longer present on the subscription, scoped to the subscription id', async () => {
      const db = createKyselyDbMock();

      await service.upsertSubscription(
        db as unknown as Parameters<StripeSyncService['upsertSubscription']>[0],
        subscription,
      );

      expect(db.deleteFrom).toHaveBeenCalledWith('stripe.subscription_items');
      expect(db.where).toHaveBeenCalledWith('subscription_id', '=', 'sub_1');
      expect(db.where).toHaveBeenCalledWith('id', 'not in', ['si_1']);
    });
  });
});
