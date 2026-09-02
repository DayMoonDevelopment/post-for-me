import type { ConfigService } from '@nestjs/config';
import type { SupabaseService } from '../../supabase/supabase.service';
import type { SocialProviderAppCredentialsDto } from '../../social-provider-app-credentials/dto/social-provider-app-credentials.dto';
import { TwitterApi } from 'twitter-api-v2';
import { generateAuthUrl } from './auth-url.helper';

describe('generateAuthUrl', () => {
  const configService = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  const supabaseService = {
    supabaseClient: {
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  } as unknown as SupabaseService;

  const baseArgs = {
    projectId: 'project-1',
    isSystem: false,
    configService,
    supabaseService,
    providerData: null,
    externalId: undefined,
    redirectUrlOverride: undefined,
    permissions: [],
    forceReauth: undefined,
  };

  const appCredentials = (
    provider: SocialProviderAppCredentialsDto['provider'],
  ): SocialProviderAppCredentialsDto => ({
    provider,
    projectId: 'project-1',
    appId: 'app-id',
    appSecret: 'app-secret',
  });

  it('includes auth_type=rerequest for facebook by default', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('facebook'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBe('rerequest');
  });

  it('omits auth_type for facebook when force_reauth is false', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('facebook'),
      forceReauth: false,
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBeNull();
  });

  it('includes auth_type=rerequest for instagram_w_facebook by default', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('instagram_w_facebook'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBe('rerequest');
  });

  it('omits auth_type for instagram_w_facebook when force_reauth is false', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('instagram_w_facebook'),
      forceReauth: false,
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBeNull();
  });

  it('does not add auth_type for native instagram, and defaults force_reauth to false', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('instagram'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBeNull();
    expect(params.get('force_reauth')).toBe('false');
  });

  it('sets force_reauth=true for native instagram when forceReauth is explicitly true', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('instagram'),
      forceReauth: true,
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('force_reauth')).toBe('true');
  });

  it('includes disable_auto_auth=1 for tiktok by default', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('tiktok'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('disable_auto_auth')).toBe('1');
  });

  it('omits disable_auto_auth for tiktok when force_reauth is false', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('tiktok'),
      forceReauth: false,
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('disable_auto_auth')).toBeNull();
  });

  it('includes disable_auto_auth=1 for tiktok_business by default', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('tiktok_business'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('disable_auto_auth')).toBe('1');
  });

  it('omits disable_auto_auth for tiktok_business when force_reauth is false', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('tiktok_business'),
      forceReauth: false,
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('disable_auto_auth')).toBeNull();
  });

  it('includes prompt=consent for youtube by default', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('youtube'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('prompt')).toBe('consent');
  });

  it('omits prompt entirely for youtube when force_reauth is false', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('youtube'),
      forceReauth: false,
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.has('prompt')).toBe(false);
  });

  describe('x (oauth1)', () => {
    let generateAuthLinkSpy: jest.SpiedFunction<
      typeof TwitterApi.prototype.generateAuthLink
    >;

    beforeEach(() => {
      generateAuthLinkSpy = jest
        .spyOn(TwitterApi.prototype, 'generateAuthLink')
        .mockResolvedValue({
          url: 'https://api.twitter.com/oauth/authorize?oauth_token=token',
          oauth_token: 'token',
          oauth_token_secret: 'secret',
          oauth_callback_confirmed: 'true',
        });
    });

    afterEach(() => {
      generateAuthLinkSpy.mockRestore();
    });

    it('does not pass forceLogin for x (oauth1) by default', async () => {
      await generateAuthUrl({
        ...baseArgs,
        appCredentials: appCredentials('x'),
      });

      expect(generateAuthLinkSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ forceLogin: undefined }),
      );
    });

    it('passes forceLogin=true for x (oauth1) when forceReauth is explicitly true', async () => {
      await generateAuthUrl({
        ...baseArgs,
        appCredentials: appCredentials('x'),
        forceReauth: true,
      });

      expect(generateAuthLinkSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ forceLogin: true }),
      );
    });
  });

  it.each(['pinterest', 'linkedin', 'threads', 'tiktok'] as const)(
    'does not add auth_type for %s',
    async (provider) => {
      const authUrl = await generateAuthUrl({
        ...baseArgs,
        appCredentials: appCredentials(provider),
      });

      const params = new URL(authUrl!).searchParams;
      expect(params.get('auth_type')).toBeNull();
    },
  );
});
