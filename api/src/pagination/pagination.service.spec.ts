import type { ConfigService } from '@nestjs/config';
import express from 'express';
import supertest from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../supabase/supabase.service';
import { SocialAccountFeedsService } from '../social-account-feeds/social-account-feeds.service';
import { PaginationService } from './pagination.service';

describe('public pagination URLs', () => {
  it.each([true, false])(
    'preserves public origin, path and query (proxied=%s)',
    async (proxied) => {
      const app = express();
      app.set('trust proxy', 1);
      app.get('/v1/items', (req, res) => {
        const pagination = new PaginationService(req);
        const feeds = new SocialAccountFeedsService(
          { get: vi.fn() } as unknown as ConfigService,
          {} as SupabaseService,
          req,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
        );
        res.json({
          offsetNext: pagination.generateNextUrl(
            { total: 50, offset: 0, limit: 20 },
            { platform: 'linkedin' },
          ),
          feedNext: feeds.generateNextUrl(
            { limit: 200, expand: ['metrics'] },
            true,
            '20',
            100,
          ),
          zeroCursor: feeds.generateNextUrl({ limit: 20 }, true, '0'),
          offsetLast: pagination.generateNextUrl(
            { total: 20, offset: 0, limit: 20 },
            {},
          ),
          feedLast: feeds.generateNextUrl({ limit: 20 }, false, '20'),
        });
      });

      const request = supertest(app)
        .get('/v1/items')
        .set('Host', 'localhost:3000');
      if (proxied) {
        request
          .set('X-Forwarded-Proto', 'https')
          .set('X-Forwarded-Host', 'api.postforme.dev');
      }
      const response = await request.expect(200);
      const body = response.body as Record<string, string | null>;
      const origin = proxied
        ? 'https://api.postforme.dev'
        : 'http://localhost:3000';
      expect(body.offsetNext).toBe(
        `${origin}/v1/items?platform=linkedin&limit=20&offset=20`,
      );
      expect(body.feedNext).toBe(
        `${origin}/v1/items?cursor=20&limit=100&expand=metrics`,
      );
      expect(body.zeroCursor).toBe(`${origin}/v1/items?cursor=0&limit=20`);
      expect(body.offsetLast).toBeNull();
      expect(body.feedLast).toBeNull();
    },
  );
});
