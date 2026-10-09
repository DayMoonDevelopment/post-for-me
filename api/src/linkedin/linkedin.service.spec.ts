import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SocialAccount } from '../lib/dto/global.dto';
import type { SupabaseService } from '../supabase/supabase.service';
import { LinkedInService } from './linkedin.service';

const account: SocialAccount = {
  provider: 'linkedin',
  id: 'spc_test',
  social_provider_user_id: '12345',
  social_provider_user_name: 'Test Page',
  social_provider_metadata: { connection_type: 'page' },
  access_token: 'test-token',
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
};

function makeService() {
  return new LinkedInService(
    {} as SupabaseService,
    { get: vi.fn() } as unknown as ConfigService,
  );
}

function mockPage(length: number, paging: Record<string, unknown>) {
  const elements = Array.from({ length }, (_, i) => ({
    id: `urn:li:share:${i}`,
    commentary: 'Test post',
  }));
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ elements, paging }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('LinkedIn account-feed pagination', () => {
  it.each([
    {
      name: 'short page with native continuation even when total is exhausted',
      length: 1,
      paging: { start: 20, count: 20, total: 21, links: [{ rel: 'next' }] },
      cursor: '20',
      next: '21',
      hasMore: true,
    },
    {
      name: 'full page without a total',
      length: 20,
      paging: { start: 20, count: 20 },
      cursor: '20',
      next: '40',
      hasMore: true,
    },
    {
      name: 'short page with an available total',
      length: 1,
      paging: { start: 20, count: 20, total: 30 },
      cursor: '20',
      next: '21',
      hasMore: true,
    },
    {
      name: 'short last page without a total (count is not a total)',
      length: 1,
      paging: { start: 20, count: 20 },
      cursor: '20',
      next: '21',
      hasMore: false,
    },
    {
      name: 'full last page with a total',
      length: 20,
      paging: { start: 20, count: 20, total: 40 },
      cursor: '20',
      next: '40',
      hasMore: false,
    },
    {
      name: 'empty page',
      length: 0,
      paging: { start: 20, count: 20, links: [{ rel: 'prev' }] },
      cursor: '20',
      next: '20',
      hasMore: false,
    },
    {
      name: 'first page starting at zero',
      length: 20,
      paging: { start: 0, count: 20 },
      cursor: undefined,
      next: '20',
      hasMore: true,
    },
    {
      name: 'missing paging.start falls back to the requested cursor',
      length: 20,
      paging: {},
      cursor: '20',
      next: '40',
      hasMore: true,
    },
  ])('$name', async ({ length, paging, cursor, next, hasMore }) => {
    const fetchMock = mockPage(length, paging);
    const result = await makeService().getAccountPosts({
      account,
      limit: 20,
      cursor,
    });

    expect(result).toMatchObject({
      count: length,
      cursor: next,
      has_more: hasMore,
    });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('count')).toBe('20');
    expect(url.searchParams.get('start')).toBe(cursor ?? '0');
    expect(url.searchParams.get('author')).toBe('urn:li:organization:12345');
    expect(result.posts.every((post) => post.account_id === '12345')).toBe(
      true,
    );
  });

  it('clamps count to 100 and uses the effective count for full-page detection', async () => {
    const fetchMock = mockPage(100, { start: 0, count: 100 });
    const result = await makeService().getAccountPosts({ account, limit: 200 });
    expect(
      new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('count'),
    ).toBe('100');
    expect(result).toMatchObject({ cursor: '100', has_more: true });
  });

  it('returns the native person ID for personal accounts', async () => {
    const fetchMock = mockPage(1, { start: 0 });
    const result = await makeService().getAccountPosts({
      account: {
        ...account,
        social_provider_metadata: { connection_type: 'personal' },
      },
      limit: 20,
    });
    expect(result.posts[0].account_id).toBe('12345');
    expect(
      new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('author'),
    ).toBe('urn:li:person:12345');
  });

  it('keeps batch lookups unpaginated and returns native account IDs', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ results: { post: { id: 'urn:li:share:1' } } }),
          ),
        ),
    );
    const result = await makeService().getAccountPosts({
      account,
      limit: 20,
      platformIds: ['urn:li:share:1'],
    });
    expect(result).toMatchObject({
      count: 1,
      cursor: undefined,
      has_more: false,
    });
    expect(result.posts[0].account_id).toBe('12345');
  });
});
