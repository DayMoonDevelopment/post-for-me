import { tasks } from '@trigger.dev/sdk/v3';
import { describe, expect, it, vi, type Mock } from 'vitest';

import type { SocialPostMetersService } from '../social-post-meters/social-post-meters.service';
import type { SupabaseService } from '../supabase/supabase.service';
import {
  createSupabaseQueryMock,
  type MockQueryResult,
  type SupabaseQueryMock,
} from '../test-utils/supabase-query-mock';
import type { CreateSocialPostDto } from './dto/create-post.dto';
import { SocialPostsService } from './social-posts.service';

vi.mock('@trigger.dev/sdk/v3', () => ({
  tasks: { trigger: vi.fn().mockResolvedValue(undefined) },
}));

interface SocialPostsServiceWithPrivates {
  validateMediaUrl(url: string): string[];
}

interface InsertedPostInsertPayload {
  status: string;
}

describe('SocialPostsService', () => {
  function buildService() {
    const client = { from: vi.fn() };
    const supabaseService = {
      supabaseClient: client,
    } as unknown as SupabaseService;
    const incrementSocialPostMeter = vi.fn().mockResolvedValue(undefined);
    const socialPostMetersService = {
      incrementSocialPostMeter,
    } as unknown as SocialPostMetersService;

    return {
      service: new SocialPostsService(supabaseService, socialPostMetersService),
      client,
      incrementSocialPostMeter,
    };
  }

  function queueFromResults(
    client: { from: Mock },
    results: MockQueryResult[],
  ): SupabaseQueryMock[] {
    const mocks = results.map((result) => createSupabaseQueryMock(result));
    for (const mock of mocks) {
      client.from.mockReturnValueOnce(mock);
    }
    return mocks;
  }

  const basePost: CreateSocialPostDto = {
    caption: 'hello world',
    scheduled_at: null,
    platform_configurations: null,
    account_configurations: null,
    media: null,
    social_accounts: ['conn-1'],
    external_id: null,
    isDraft: null,
  };

  describe('validateMediaUrl (pure, exercised via bracket access)', () => {
    // validateMediaUrl is a private instance method with no `this` usage,
    // so it can be invoked unbound for pure edge-case coverage.
    function validate(url: string): string[] {
      return (
        SocialPostsService.prototype as unknown as SocialPostsServiceWithPrivates
      ).validateMediaUrl(url);
    }

    it('accepts a valid https URL', () => {
      expect(validate('https://example.com/image.png')).toEqual([]);
    });

    it('accepts a valid http URL', () => {
      expect(validate('http://example.com/image.png')).toEqual([]);
    });

    it('rejects a malformed/unparseable URL', () => {
      expect(validate('not-a-url')).toEqual(['invalid media URL: not-a-url']);
    });

    it('rejects a non-http(s) protocol', () => {
      expect(validate('ftp://example.com/file')).toEqual([
        'media URL must use http or https protocol: ftp://example.com/file',
      ]);
    });

    it.each([
      'http://localhost/image.png',
      'http://127.0.0.1/image.png',
      'http://foo.localhost/image.png',
    ])('rejects localhost variants: %s', (url) => {
      expect(validate(url)).toEqual([
        `media URL cannot point to localhost: ${url}`,
      ]);
    });

    it('rejects localhost regardless of hostname casing', () => {
      expect(validate('http://LOCALHOST/image.png')).toEqual([
        'media URL cannot point to localhost: http://LOCALHOST/image.png',
      ]);
    });

    it('rejects a bare public IPv4 address', () => {
      expect(validate('http://8.8.8.8/image.png')).toEqual([
        'media URL cannot use IP addresses: http://8.8.8.8/image.png',
      ]);
    });

    it.each(['10.0.0.5', '172.16.0.5', '192.168.1.5'])(
      'rejects private IPv4 range %s with the generic IP-address error (private-IP branch is unreachable dead code)',
      (host) => {
        const url = `http://${host}/image.png`;
        expect(validate(url)).toEqual([
          `media URL cannot use IP addresses: ${url}`,
        ]);
      },
    );

    it('rejects a bare IPv6 literal (hostname keeps brackets, so it misses the ::1 localhost check and hits the generic IP-address check)', () => {
      const url = 'http://[::1]/image.png';
      expect(validate(url)).toEqual([
        `media URL cannot use IP addresses: ${url}`,
      ]);
    });
  });

  describe('validatePost', () => {
    it('returns invalid when no post body is provided', async () => {
      const { service } = buildService();

      const result = await service.validatePost({
        post: undefined as unknown as CreateSocialPostDto,
        projectId: 'project-1',
      });

      expect(result).toEqual({
        isValid: false,
        errors: ['please provide a request body'],
      });
    });

    it('requires a caption', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: [{ id: 'conn-1', provider: 'facebook' }], error: null },
      ]);

      const result = await service.validatePost({
        post: { ...basePost, caption: '' },
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('caption is required');
    });

    it('requires at least one social account', async () => {
      const { service } = buildService();

      const result = await service.validatePost({
        post: {
          ...basePost,
          social_accounts: undefined,
        } as unknown as CreateSocialPostDto,
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'at least one social_account is required',
      );
    });

    it('flags social accounts not owned by the project', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [{ data: [], error: null }]);

      const result = await service.validatePost({
        post: basePost,
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'invalid social accounts, not owned by user',
      );
    });

    it('surfaces a Supabase error from the ownership check', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: null, error: { message: 'db unreachable' } },
      ]);

      const result = await service.validatePost({
        post: basePost,
        projectId: 'project-1',
      });

      expect(result.errors).toContain('db unreachable');
    });

    it('rejects a scheduled_at in the past', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: [{ id: 'conn-1', provider: 'facebook' }], error: null },
      ]);

      const result = await service.validatePost({
        post: { ...basePost, scheduled_at: new Date(Date.now() - 60_000) },
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('scheduled_at must be in the future');
    });

    it('validates top-level media URLs', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: [{ id: 'conn-1', provider: 'facebook' }], error: null },
      ]);

      const result = await service.validatePost({
        post: {
          ...basePost,
          media: [{ url: 'not-a-url' }],
        } as unknown as CreateSocialPostDto,
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid media URL: not-a-url');
    });

    it('validates platform_configurations media URLs with a provider-prefixed error', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: [{ id: 'conn-1', provider: 'facebook' }], error: null },
      ]);

      const result = await service.validatePost({
        post: {
          ...basePost,
          platform_configurations: {
            facebook: { media: [{ url: 'not-a-url' }] },
          },
        } as unknown as CreateSocialPostDto,
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('facebook: invalid media URL: not-a-url');
    });

    it('validates account_configurations media URLs with an account-prefixed error', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: [{ id: 'conn-1', provider: 'facebook' }], error: null },
      ]);

      const result = await service.validatePost({
        post: {
          ...basePost,
          account_configurations: [
            {
              social_account_id: 'conn-1',
              configuration: { media: [{ url: 'not-a-url' }] },
            },
          ],
        } as unknown as CreateSocialPostDto,
        projectId: 'project-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'account conn-1: invalid media URL: not-a-url',
      );
    });

    it('returns valid for a fully valid post', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: [{ id: 'conn-1', provider: 'facebook' }], error: null },
      ]);

      const result = await service.validatePost({
        post: {
          ...basePost,
          scheduled_at: new Date(Date.now() + 60_000),
          media: [{ url: 'https://example.com/a.png' }],
        } as unknown as CreateSocialPostDto,
        projectId: 'project-1',
      });

      expect(result).toEqual({ isValid: true, errors: [] });
    });
  });

  describe('validatePostCaptionLength', () => {
    const { service } = buildService();

    it('accepts a caption under the max length', () => {
      expect(
        service.validatePostCaptionLength({ caption: 'short', platform: 'x' }),
      ).toEqual({
        isValid: true,
        error: 'caption must be less than 2200 characters',
      });
    });

    it('accepts a caption exactly at the max length', () => {
      const caption = 'a'.repeat(2200);
      expect(
        service.validatePostCaptionLength({ caption, platform: 'x' }).isValid,
      ).toBe(true);
    });

    it('rejects a caption over the max length', () => {
      const caption = 'a'.repeat(2201);
      expect(
        service.validatePostCaptionLength({ caption, platform: 'x' }).isValid,
      ).toBe(false);
    });
  });

  describe('createPost', () => {
    const insertedPost = {
      id: 'post-1',
      project_id: 'project-1',
      caption: 'hello world',
      external_id: null,
      api_key: 'key-1',
    };

    const insertedAccounts = {
      data: [
        {
          provider_connection_id: 'conn-1',
          social_provider_connections: { provider: 'facebook' },
        },
      ],
      error: null,
    };

    const finalPostRow = {
      id: 'post-1',
      project_id: 'project-1',
      external_id: null,
      caption: 'hello world',
      status: 'draft',
      post_at: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      social_post_provider_connections: [],
      social_post_media: [],
      social_post_configurations: [],
    };

    it('creates a draft post when isDraft is true, without triggering or incrementing meters', async () => {
      const { service, client, incrementSocialPostMeter } = buildService();
      const [firstQuery] = queueFromResults(client, [
        { data: { ...insertedPost, status: 'draft' }, error: null },
        insertedAccounts,
        { error: null },
        { error: null },
        { data: { ...finalPostRow, status: 'draft' }, error: null },
      ]);

      const result = await service.createPost({
        post: { ...basePost, isDraft: true },
        projectId: 'project-1',
        apiKey: 'key-1',
        teamId: 'team-1',
        isSystem: false,
      });

      expect(client.from).toHaveBeenNthCalledWith(1, 'social_posts');
      const firstInsertCall = firstQuery.insert.mock
        .calls[0][0] as InsertedPostInsertPayload;
      expect(firstInsertCall.status).toBe('draft');
      expect(result?.status).toBe('draft');
      expect(tasks.trigger).not.toHaveBeenCalled();
      expect(incrementSocialPostMeter).not.toHaveBeenCalled();
    });

    it('creates a scheduled post when scheduled_at is provided', async () => {
      const { service, client } = buildService();
      const [firstQuery] = queueFromResults(client, [
        { data: { ...insertedPost, status: 'scheduled' }, error: null },
        insertedAccounts,
        { error: null },
        { error: null },
        { data: { ...finalPostRow, status: 'scheduled' }, error: null },
      ]);

      await service.createPost({
        post: { ...basePost, scheduled_at: new Date(Date.now() + 60_000) },
        projectId: 'project-1',
        apiKey: 'key-1',
        teamId: 'team-1',
        isSystem: false,
      });

      const firstInsertCall = firstQuery.insert.mock
        .calls[0][0] as InsertedPostInsertPayload;
      expect(firstInsertCall.status).toBe('scheduled');
      expect(tasks.trigger).not.toHaveBeenCalled();
    });

    it('creates a processing post and triggers the process-post job', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: { ...insertedPost, status: 'processing' }, error: null },
        insertedAccounts,
        { error: null },
        { error: null },
        { data: { id: 'post-1' }, error: null }, // triggerPost's own select
        { data: { ...finalPostRow, status: 'processing' }, error: null },
      ]);

      await service.createPost({
        post: basePost,
        projectId: 'project-1',
        apiKey: 'key-1',
        teamId: 'team-1',
        isSystem: false,
      });

      expect(tasks.trigger).toHaveBeenCalledWith(
        'process-post',
        expect.objectContaining({ index: 0 }),
        expect.objectContaining({ idempotencyKey: 'process-post:post-1' }),
      );
    });

    it('increments social post meters for each inserted account only when isSystem is true', async () => {
      const { service, client, incrementSocialPostMeter } = buildService();
      queueFromResults(client, [
        { data: { ...insertedPost, status: 'draft' }, error: null },
        insertedAccounts,
        { error: null },
        { error: null },
        { data: { ...finalPostRow, status: 'draft' }, error: null },
      ]);

      await service.createPost({
        post: { ...basePost, isDraft: true },
        projectId: 'project-1',
        apiKey: 'key-1',
        teamId: 'team-1',
        isSystem: true,
      });

      expect(incrementSocialPostMeter).toHaveBeenCalledTimes(1);
      expect(incrementSocialPostMeter).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: 'team-1', provider: 'facebook' }),
      );
    });

    it('throws when the initial post insert returns an error', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [
        { data: null, error: { message: 'insert failed' } },
      ]);

      await expect(
        service.createPost({
          post: { ...basePost, isDraft: true },
          projectId: 'project-1',
          apiKey: 'key-1',
          teamId: 'team-1',
          isSystem: false,
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('getPostById / transformPostData', () => {
    it('splits media into global/platform/account buckets and applies socialAccount defaults', async () => {
      const { service, client } = buildService();

      const rawRow = {
        id: 'post-1',
        project_id: 'project-1',
        external_id: null,
        caption: 'hello world',
        status: 'processing',
        post_at: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        social_post_provider_connections: [
          {
            social_provider_connections: {
              id: 'conn-1',
              provider: 'facebook',
              social_provider_user_name: 'my-page',
              social_provider_user_id: 'user-1',
              access_token: null,
              refresh_token: null,
              access_token_expires_at: null,
              refresh_token_expires_at: null,
              external_id: null,
            },
          },
        ],
        social_post_media: [
          {
            url: 'https://example.com/global.png',
            thumbnail_url: null,
            thumbnail_timestamp_ms: null,
            provider: null,
            provider_connection_id: null,
            tags: null,
            skip_processing: null,
          },
          {
            url: 'https://example.com/account.png',
            thumbnail_url: null,
            thumbnail_timestamp_ms: null,
            provider: null,
            provider_connection_id: 'conn-1',
            tags: null,
            skip_processing: null,
          },
        ],
        social_post_configurations: [
          {
            caption: 'fb caption',
            provider: 'facebook',
            provider_connection_id: null,
            provider_data: {},
          },
          {
            caption: 'acct caption',
            provider: null,
            provider_connection_id: 'conn-1',
            provider_data: {},
          },
        ],
      };

      queueFromResults(client, [{ data: rawRow, error: null }]);

      const result = await service.getPostById('post-1', 'project-1');

      expect(result?.media).toEqual([
        {
          url: 'https://example.com/global.png',
          thumbnail_url: null,
          thumbnail_timestamp_ms: null,
          tags: null,
          skip_processing: null,
        },
      ]);

      expect(result?.platform_configurations?.facebook?.caption).toBe(
        'fb caption',
      );
      expect(result?.platform_configurations?.facebook?.media).toHaveLength(1);
      expect(result?.platform_configurations?.facebook?.media?.[0].url).toBe(
        'https://example.com/account.png',
      );

      expect(result?.account_configurations).toHaveLength(1);
      expect(result?.account_configurations?.[0].social_account_id).toBe(
        'conn-1',
      );
      expect(result?.account_configurations?.[0].configuration.caption).toBe(
        'acct caption',
      );

      const socialAccount = result?.social_accounts[0];
      expect(socialAccount?.access_token).toBe('');
      expect(typeof socialAccount?.access_token_expires_at).toBe('string');
    });

    it('returns null when no row is found', async () => {
      const { service, client } = buildService();
      queueFromResults(client, [{ data: null, error: null }]);

      const result = await service.getPostById('missing-post', 'project-1');

      expect(result).toBeNull();
    });
  });
});
