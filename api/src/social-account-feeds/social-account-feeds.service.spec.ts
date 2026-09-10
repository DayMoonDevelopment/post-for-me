import type { Request } from 'express';
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
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    update: jest.fn(() => chain),
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

function makeService(fromMock: jest.Mock): SocialAccountFeedsService {
  const supabaseService = {
    supabaseClient: { from: fromMock },
  } as unknown as SupabaseService;
  const configService = { get: jest.fn() } as unknown as ConfigService;

  return new SocialAccountFeedsService(
    configService,
    supabaseService,
    {} as Request,
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
  describe('reconcileFacebookProviderPostIds', () => {
    it('joins an unmatched video post to its stale row and rewrites provider_post_id', async () => {
      const candidateRow = {
        id: 'result_1',
        post_id: 'social_post_1',
        provider_post_id: 'vid_1',
        provider_post_url: 'https://facebook.com/page_1/videos/vid_1',
        social_posts: { external_id: 'ext_1' },
      };

      const fromMock = jest
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
        update: jest.Mock;
      };
      expect(updateChain.update).toHaveBeenCalledWith({
        provider_post_id: 'page_1_post_1',
        provider_post_url: post.url,
      });
    });

    it('does nothing when no candidate row matches the video target id', async () => {
      const fromMock = jest
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
      const fromMock = jest.fn();
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
