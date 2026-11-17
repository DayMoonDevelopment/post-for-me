import type { ConfigService } from '@nestjs/config';
import express from 'express';
import supertest from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../supabase/supabase.service';
import { SocialAccountFeedsService } from '../social-account-feeds/social-account-feeds.service';
import { PaginationService } from './pagination.service';

describe('public pagination URLs', () => {
  it.each([
    { baseUrl: undefined, origin: 'https://api.postforme.dev' },
    { baseUrl: 'http://localhost:3000', origin: 'http://localhost:3000' },
    {
      baseUrl: 'https://staging.postforme.dev/',
      origin: 'https://staging.postforme.dev',
    },
  ])(
    'uses configured origin and preserves path and query (baseUrl=$baseUrl)',
    async ({ baseUrl, origin }) => {
      const configService = {
        get: vi.fn((key: string) =>
          key === 'API_BASE_URL' ? baseUrl : undefined,
        ),
      } as unknown as ConfigService;
      const app = express();
      app.get('/v1/items', (req, res) => {
        const pagination = new PaginationService(req, configService);
        const feeds = new SocialAccountFeedsService(
          configService,
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

      for (const forwarded of [false, true]) {
        const request = supertest(app)
          .get('/v1/items')
          .set('Host', 'untrusted.example');
        if (forwarded) {
          request
            .set('X-Forwarded-Proto', 'http')
            .set('X-Forwarded-Host', 'forwarded.example');
        }
        const response = await request.expect(200);
        const body = response.body as Record<string, string | null>;
        expect(body.offsetNext).toBe(
          `${origin}/v1/items?platform=linkedin&limit=20&offset=20`,
        );
        expect(body.feedNext).toBe(
          `${origin}/v1/items?cursor=20&limit=100&expand=metrics`,
        );
        expect(body.zeroCursor).toBe(`${origin}/v1/items?cursor=0&limit=20`);
        expect(body.offsetLast).toBeNull();
        expect(body.feedLast).toBeNull();
      }
    },
  );
});
