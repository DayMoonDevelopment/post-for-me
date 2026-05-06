import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type { EventsId } from '../../../kysely/types/stripe/Events';

import { KyselyService } from '../../../kysely/kysely.service';

import { StripeSyncService } from './stripe-sync.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly kysely: KyselyService,
    private readonly syncService: StripeSyncService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
    }

    this.stripe = new Stripe(secretKey, { typescript: true });
    this.webhookSecret = webhookSecret;
  }

  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    const db = this.kysely.db;

    const requestId =
      typeof event.request === 'string'
        ? event.request
        : (event.request?.id ?? null);
    const idempotencyKey =
      typeof event.request === 'object'
        ? (event.request?.idempotency_key ?? null)
        : null;
    const eventRow = {
      type: event.type,
      api_version: event.api_version,
      livemode: event.livemode,
      request_id: requestId,
      idempotency_key: idempotencyKey,
      stripe_created: new Date(event.created * 1000),
      data: JSON.stringify(event),
    };

    const eventId = event.id as EventsId;
    await db
      .insertInto('stripe.events')
      .values({ id: eventId, ...eventRow })
      .onConflict((oc) => oc.column('id').doUpdateSet(eventRow))
      .execute();

    try {
      await this.syncService.applyEvent(db, event);
      await db
        .updateTable('stripe.events')
        .set({ processed_at: new Date(), error: null })
        .where('id', '=', eventId)
        .execute();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to apply stripe event ${event.id} (${event.type}): ${message}`,
      );
      await db
        .updateTable('stripe.events')
        .set({ error: message })
        .where('id', '=', eventId)
        .execute();
      throw err;
    }
  }
}
