import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PlatformPost } from '../lib/dto/global.dto';
import type { SupabaseService } from '../supabase/supabase.service';
import { SocialAccountFeedsService } from './social-account-feeds.service';

type PostResultMapEntry = {
  social_post_result_id: string;
  social_post_id: string;
  external_post_id: string | null | undefined;
};

interface SocialAccountFeedsServiceTestAccess {
  reconcileFacebookProviderPostIds(args: {
    accountId: string;
    posts: PlatformPost[];
    postResultMap: Map<string, PostResultMapEntry>;
  }): Promise<void>;
}

function asTestAccess(
  service: SocialAccountFeedsService,
): SocialAccountFeedsServiceTestAccess {
  return service as unknown as SocialAccountFeedsServiceTestAccess;
}

// Minimal thenable that mimics a Supabase PostgrestFilterBuilder: every
// query-builder method returns the same chain, and awaiting the chain
// resolves to the given result.
function makeSupabaseChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  };
  return chain;
}

function makePost(overrides: Partial<PlatformPost> = {}): PlatformPost {
  return {
    provider: 'facebook',
    id: 'page_1_post_1',
    account_id: 'page_1',
    caption: 'hello world',
    url: 'https://facebook.com/page_1/videos/vid_1',
    media: [],
    ...overrides,
  };
}

function makeService(
  fromMock: ReturnType<typeof vi.fn>,
  request: Request = {} as Request,
): SocialAccountFeedsService {
  const supabaseService = {
    supabaseClient: { from: fromMock },
  } as unknown as SupabaseService;
  const configService = { get: vi.fn() } as unknown as ConfigService;

  return new SocialAccountFeedsService(
    configService,
    supabaseService,
    request,
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
}

describe('SocialAccountFeedsService', () => {
  it('reports the clamped LinkedIn limit in the adapter call, metadata, and next URL', async () => {
    const fromMock = vi.fn().mockImplementation((table: string) =>
      makeSupabaseChain({
        data:
          table === 'social_provider_connections'
            ? {
                id: 'spc_test',
                provider: 'linkedin',
                social_provider_user_id: '12345',
                access_token: 'test',
                access_token_expires_at: '2099-01-01',
              }
            : [],
      }),
    );
    const service = makeService(fromMock, {
      protocol: 'https',
      host: 'api.postforme.dev',
      path: '/v1/social-account-feeds/spc_test',
    } as Request);
    const getAccountPosts = vi.fn().mockResolvedValue({
      posts: [makePost({ provider: 'linkedin', account_id: '12345' })],
      count: 1,
      cursor: '1',
      has_more: true,
    });
    vi.spyOn(service, 'getPlatformService').mockResolvedValue({
      getAccountPosts,
    } as never);

    const result = await service.getPlatformPosts({
      accountId: 'spc_test',
      projectId: 'project_test',
      queryParams: { limit: 200 },
    });

    expect(getAccountPosts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
    expect(result.meta).toMatchObject({
      limit: 100,
      cursor: '1',
      has_more: true,
    });
    expect(new URL(result.meta.next!).searchParams.get('limit')).toBe('100');
    expect(result.data[0]).toMatchObject({
      platform_account_id: '12345',
      social_account_id: 'spc_test',
    });
  });

  describe('reconcileFacebookProviderPostIds', () => {
    it('joins an unmatched video post to its stale row and rewrites provider_post_id', async () => {
      const candidateRow = {
        id: 'result_1',
        post_id: 'social_post_1',
        provider_post_id: 'vid_1',
        provider_post_url: 'https://facebook.com/page_1/videos/vid_1',
        social_posts: { external_id: 'ext_1' },
      };

      const fromMock = vi
        .fn()
        .mockReturnValueOnce(
          makeSupabaseChain({ data: [candidateRow], error: null }),
        )
        .mockReturnValueOnce(makeSupabaseChain({ error: null }));

      const service = makeService(fromMock);
      const postResultMap = new Map<string, PostResultMapEntry>();
      const post = makePost({
        id: 'page_1_post_1',
        video_target_id: 'vid_1',
      });

      await asTestAccess(service).reconcileFacebookProviderPostIds({
        accountId: 'account_1',
        posts: [post],
        postResultMap,
      });

      expect(postResultMap.get('page_1_post_1')).toEqual({
        social_post_result_id: 'result_1',
        social_post_id: 'social_post_1',
        external_post_id: 'ext_1',
      });

      const updateChain = fromMock.mock.results[1].value as {
        update: ReturnType<typeof vi.fn>;
      };
      expect(updateChain.update).toHaveBeenCalledWith({
        provider_post_id: 'page_1_post_1',
        provider_post_url: post.url,
      });
    });

    it('does nothing when no candidate row matches the video target id', async () => {
      const fromMock = vi
        .fn()
        .mockReturnValueOnce(makeSupabaseChain({ data: [], error: null }));

      const service = makeService(fromMock);
      const postResultMap = new Map<string, PostResultMapEntry>();
      const post = makePost({
        id: 'page_1_post_1',
        video_target_id: 'vid_unmatched',
      });

      await asTestAccess(service).reconcileFacebookProviderPostIds({
        accountId: 'account_1',
        posts: [post],
        postResultMap,
      });

      expect(postResultMap.size).toBe(0);
      expect(fromMock).toHaveBeenCalledTimes(1);
    });

    it('skips posts that already have a postResultMap entry or no video_target_id', async () => {
      const fromMock = vi.fn();
      const service = makeService(fromMock);

      const matchedPost = makePost({
        id: 'already_matched',
        video_target_id: 'vid_1',
      });
      const textPost = makePost({
        id: 'text_post',
        video_target_id: undefined,
      });

      const postResultMap = new Map<string, PostResultMapEntry>([
        [
          'already_matched',
          {
            social_post_result_id: 'r',
            social_post_id: 'p',
            external_post_id: 'e',
          },
        ],
      ]);

      await asTestAccess(service).reconcileFacebookProviderPostIds({
        accountId: 'account_1',
        posts: [matchedPost, textPost],
        postResultMap,
      });

      expect(fromMock).not.toHaveBeenCalled();
    });
  });
});
