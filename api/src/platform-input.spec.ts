import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { RequestUser } from './auth/user.interface';
import type { PaginationService } from './pagination/pagination.service';
import type { SupabaseService } from './supabase/supabase.service';
import { SocialAccountsController } from './social-provider-connections/social-provider-connections.controller';
import { SocialAccountsService } from './social-provider-connections/social-provider-connections.service';
import type { CreateSocialAccountDto } from './social-provider-connections/dto/create-social-account.dto';
import type { CreateSocialAccountProviderAuthUrlDto } from './social-provider-connections/dto/create-provider-auth-url.dto';
import { SocialProviderAppCredentialsService } from './social-provider-app-credentials/social-provider-app-credentials.service';
import { SocialPostsService } from './social-posts/social-posts.service';
import { SocialPostQueryDto } from './social-posts/dto/post-query.dto';
import type { SocialPostMetersService } from './social-post-meters/social-post-meters.service';
import { PostResultsService } from './social-post-results/social-post-results.service';
import { SocialPostPreviewsService } from './social-posts-previews/social-posts-previews.service';
import type { CreateSocialPostPreviewDto } from './social-posts-previews/dto/create-post-preview.dto';

function makeChain(data: unknown = []) {
  const chain: Record<
    | 'select'
    | 'eq'
    | 'in'
    | 'range'
    | 'order'
    | 'upsert'
    | 'single'
    | 'maybeSingle',
    ReturnType<typeof vi.fn>
  > & { then: (resolve: (value: unknown) => unknown) => unknown } = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    range: vi.fn(() => chain),
    order: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    single: vi.fn(() => chain),
    maybeSingle: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data, error: null, count: 0 }),
  };
  return chain;
}

function makeSupabase(from: ReturnType<typeof vi.fn>): SupabaseService {
  return {
    supabaseClient: { from },
    supabaseServiceRole: { from },
  } as unknown as SupabaseService;
}

describe('request platform identifiers', () => {
  it.each([' FaCeBoOk , X ', [' FaCeBoOk ', ' X ']])(
    'uses canonical enum values for account, post, and result filters: %p',
    async (platform) => {
      const accounts = makeChain();
      const posts = makeChain();
      const resultPosts = makeChain([{ id: 'post_1' }]);
      const results = makeChain();
      const supabase = makeSupabase(
        vi
          .fn()
          .mockReturnValueOnce(accounts)
          .mockReturnValueOnce(posts)
          .mockReturnValueOnce(resultPosts)
          .mockReturnValueOnce(results),
      );
      const query = {
        offset: 0,
        limit: 10,
        platform: platform as string[],
      };

      await new SocialAccountsService(
        supabase,
        {} as ConfigService,
      ).getSocialAccounts(query, 'project_1');
      await new SocialPostsService(
        supabase,
        {} as SocialPostMetersService,
      ).buildPostQuery(query, 'project_1');
      await new PostResultsService(supabase).getPostResults(query, 'project_1');

      expect(accounts.in).toHaveBeenCalledWith('provider', ['facebook', 'x']);
      expect(posts.in).toHaveBeenCalledWith(
        'social_post_provider_connections.social_provider_connections.provider',
        ['facebook', 'x'],
      );
      expect(results.in).toHaveBeenCalledWith(
        'social_provider_connections.provider',
        ['facebook', 'x'],
      );
      expect(query.platform).toEqual(platform);
    },
  );

  it('writes a canonical provider when creating an account without altering metadata', async () => {
    const chain = makeChain({ id: 'account_1', provider: 'tiktok_business' });
    const service = new SocialAccountsService(
      makeSupabase(vi.fn(() => chain)),
      {} as ConfigService,
    );
    const socialAccount = {
      platform: ' TiKtOk_BuSiNeSs ',
      user_id: 'UserID',
      access_token: 'Token',
      access_token_expires_at: new Date('2030-01-01'),
      metadata: { platform: 'KeepCase' },
    } as unknown as CreateSocialAccountDto;

    const result = await service.createSocialAccount({
      projectId: 'project_1',
      socialAccount,
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'tiktok_business',
        social_provider_user_id: 'UserID',
        access_token: 'Token',
        social_provider_metadata: { platform: 'KeepCase' },
      }),
      { onConflict: 'provider,project_id,social_provider_user_id' },
    );
    expect(result.platform).toBe('tiktok_business');
    expect(socialAccount.platform).toBe(' TiKtOk_BuSiNeSs ');
  });

  it('canonicalizes single and multiple app credential lookups', async () => {
    const single = makeChain(null);
    const many = makeChain();
    const service = new SocialProviderAppCredentialsService(
      makeSupabase(
        vi.fn().mockReturnValueOnce(single).mockReturnValueOnce(many),
      ),
    );

    await service.getSocialProviderAppCredentials(' X_OAuth2 ', 'project_1');
    await service.getManySocialProviderAppCredentials(
      [' InStAgRaM ', ' INSTAGRAM_W_FACEBOOK '],
      'project_1',
    );

    expect(single.eq).toHaveBeenCalledWith('provider', 'x_oauth2');
    expect(many.in).toHaveBeenCalledWith('provider', [
      'instagram',
      'instagram_w_facebook',
    ]);
  });

  it.each<{
    platform: string;
    platform_data?: CreateSocialAccountProviderAuthUrlDto['platform_data'];
    provider: string;
    many?: string[];
  }>([
    { platform: ' BlUeSkY ', provider: 'bluesky' },
    { platform: ' FaCeBoOk ', provider: 'facebook' },
    {
      platform: ' InStAgRaM ',
      platform_data: { instagram: { connection_type: 'instagram' } },
      provider: 'instagram',
    },
    {
      platform: ' INSTAGRAM ',
      platform_data: { instagram: { connection_type: 'facebook' } },
      provider: 'instagram_w_facebook',
    },
    {
      platform: ' InStAgRaM ',
      provider: 'instagram',
      many: ['instagram', 'instagram_w_facebook'],
    },
    {
      platform: ' X ',
      platform_data: { x: { connection_type: 'oauth2' } },
      provider: 'x_oauth2',
    },
    { platform: ' X ', provider: 'x', many: ['x', 'x_oauth2'] },
  ])(
    'dispatches auth URLs using a local canonical platform: %p',
    async (input) => {
      const credentials = { provider: input.provider };
      const credentialService = {
        getSocialProviderAppCredentials: vi.fn().mockResolvedValue(credentials),
        getManySocialProviderAppCredentials: vi
          .fn()
          .mockResolvedValue([credentials]),
      };
      const accounts = {
        getSocialAccountAuthUrl: vi
          .fn<SocialAccountsService['getSocialAccountAuthUrl']>()
          .mockResolvedValue('https://auth.test'),
      };
      const controller = new SocialAccountsController(
        accounts as unknown as SocialAccountsService,
        {} as PaginationService,
        credentialService as unknown as SocialProviderAppCredentialsService,
        makeSupabase(vi.fn(() => makeChain({ is_system: false }))),
      );

      const result = await controller.createSocialAccountAuthUrl(input, {
        projectId: 'project_1',
      } as RequestUser);

      expect(result).toEqual({
        url: 'https://auth.test',
        platform: input.platform.trim().toLowerCase(),
      });
      if (input.many) {
        expect(
          credentialService.getManySocialProviderAppCredentials,
        ).toHaveBeenCalledWith(input.many, 'project_1');
      } else if (input.provider !== 'bluesky') {
        expect(
          credentialService.getSocialProviderAppCredentials,
        ).toHaveBeenCalledWith(input.provider, 'project_1');
      } else {
        expect(
          credentialService.getSocialProviderAppCredentials,
        ).not.toHaveBeenCalled();
      }
      expect(
        accounts.getSocialAccountAuthUrl.mock.calls[0][0].appCredentials
          .provider,
      ).toBe(input.provider);
      expect(
        accounts.getSocialAccountAuthUrl.mock.calls[0][0].providerData,
      ).toBe(input.platform_data);
      expect(input.platform).toMatch(/^ /);
    },
  );

  it('looks up lowercase preview configuration keys and preserves media tags', () => {
    const input = {
      caption: 'default',
      media: [
        { url: 'https://media.test', tags: [{ platform: ' InStAgRaM ' }] },
      ],
      preview_social_accounts: [{ id: 'account_1', platform: ' InStAgRaM ' }],
      platform_configurations: {
        instagram: { caption: 'override' },
        INSTAGRAM: { caption: 'unsupported key' },
      },
    } as unknown as CreateSocialPostPreviewDto;
    const service = new SocialPostPreviewsService();

    const [preview] = service.createPostPreview(input);

    expect(preview.platform).toBe('instagram');
    expect(preview.caption).toBe('override');
    expect(preview.media).toBe(input.media);
    expect(preview.media?.[0].tags?.[0].platform).toBe(' InStAgRaM ');
    expect(input.preview_social_accounts[0].platform).toBe(' InStAgRaM ');
    delete input.platform_configurations?.instagram;
    expect(service.createPostPreview(input)[0].caption).toBe('default');
  });

  describe('SocialPostQueryDto validation', () => {
    const pipe = new ValidationPipe({ transform: true });
    const metadata = { type: 'query' as const, metatype: SocialPostQueryDto };

    it.each([' FaCeBoOk ', [' InStAgRaM ', ' X ']])(
      'accepts mixed-case platform strings: %p',
      async (platform) => {
        const result = (await pipe.transform(
          { platform, external_id: ['KeepCase'] },
          metadata,
        )) as SocialPostQueryDto;
        expect(result.platform).toEqual(
          Array.isArray(platform) ? ['instagram', 'x'] : 'facebook',
        );
        expect(result.external_id).toEqual(['KeepCase']);
      },
    );

    it.each(['unsupported', ['FACEBOOK', 123], 123, { platform: 'FACEBOOK' }])(
      'rejects invalid platform values: %p',
      async (platform) => {
        await expect(pipe.transform({ platform }, metadata)).rejects.toThrow();
      },
    );
  });
});
