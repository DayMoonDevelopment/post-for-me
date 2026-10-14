import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

import type { KyselyService } from '../../../kysely/kysely.service';
import { StripeWebhookService } from './stripe.service';
import type { StripeSyncService } from './stripe-sync.service';

const STRIPE_SECRET_KEY = 'sk_test_123';
const STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

function buildSignatureHeader(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('StripeWebhookService', () => {
  function buildConfigService(
    overrides: Record<string, string | undefined> = {},
  ) {
    const values: Record<string, string | undefined> = {
      STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET,
      ...overrides,
    };
    return {
      get: vi.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  function buildService({
    configService = buildConfigService(),
    db = {},
    applyEvent = vi.fn().mockResolvedValue(undefined),
  }: {
    configService?: ConfigService;
    db?: unknown;
    applyEvent?: ReturnType<typeof vi.fn>;
  } = {}) {
    const kysely = { db } as unknown as KyselyService;
    const syncService = { applyEvent } as unknown as StripeSyncService;
    return {
      service: new StripeWebhookService(configService, kysely, syncService),
      applyEvent,
      db,
    };
  }

  it('throws at construction when STRIPE_SECRET_KEY is missing', () => {
    expect(() =>
      buildService({
        configService: buildConfigService({ STRIPE_SECRET_KEY: undefined }),
      }),
    ).toThrow('STRIPE_SECRET_KEY is not defined');
  });

  it('throws at construction when STRIPE_WEBHOOK_SECRET is missing', () => {
    expect(() =>
      buildService({
        configService: buildConfigService({
          STRIPE_WEBHOOK_SECRET: undefined,
        }),
      }),
    ).toThrow('STRIPE_WEBHOOK_SECRET is not defined');
  });

  describe('constructEvent', () => {
    it('parses a validly signed payload into a Stripe event', () => {
      const { service } = buildService();
      const payload = JSON.stringify({
        id: 'evt_1',
        object: 'event',
        type: 'customer.created',
      });
      const signature = buildSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);

      const event = service.constructEvent(Buffer.from(payload), signature);

      expect(event.id).toBe('evt_1');
      expect(event.type).toBe('customer.created');
    });

    it('throws when the payload was signed with a different secret', () => {
      const { service } = buildService();
      const payload = JSON.stringify({
        id: 'evt_1',
        object: 'event',
        type: 'customer.created',
      });
      const signature = buildSignatureHeader(payload, 'wrong-secret');

      expect(() =>
        service.constructEvent(Buffer.from(payload), signature),
      ).toThrow();
    });

    it('throws when the payload is tampered with after signing', () => {
      const { service } = buildService();
      const payload = JSON.stringify({
        id: 'evt_1',
        object: 'event',
        type: 'customer.created',
      });
      const signature = buildSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);
      const tamperedPayload = JSON.stringify({
        id: 'evt_1',
        object: 'event',
        type: 'customer.deleted',
      });

      expect(() =>
        service.constructEvent(Buffer.from(tamperedPayload), signature),
      ).toThrow();
    });
  });

  describe('handleEvent', () => {
    it('delegates to the sync service with the kysely db and the event', async () => {
      const db = { marker: 'the-db' };
      const applyEvent = vi.fn().mockResolvedValue(undefined);
      const { service } = buildService({ db, applyEvent });
      const event = {
        id: 'evt_1',
        type: 'customer.created',
      } as unknown as Stripe.Event;

      await service.handleEvent(event);

      expect(applyEvent).toHaveBeenCalledWith(db, event);
    });

    it('rethrows when the sync service fails to apply the event', async () => {
      const applyEvent = vi.fn().mockRejectedValue(new Error('db unreachable'));
      const { service } = buildService({ applyEvent });
      const event = {
        id: 'evt_1',
        type: 'customer.created',
      } as unknown as Stripe.Event;

      await expect(service.handleEvent(event)).rejects.toThrow(
        'db unreachable',
      );
    });
  });
});
