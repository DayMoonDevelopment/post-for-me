import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Provider } from '../../lib/dto/global.dto';
import type { SupabaseService } from '../../supabase/supabase.service';
import type { SocialProviderAppCredentialsDto } from '../../social-provider-app-credentials/dto/social-provider-app-credentials.dto';
import type { AuthUrlProviderData } from '../dto/create-provider-auth-url.dto';
import { generateAuthUrl } from './auth-url.helper';

const { generateAuthLink, TwitterApi } = vi.hoisted(() => {
  const generateAuthLink = vi.fn().mockResolvedValue({
    url: 'https://api.twitter.com/oauth/authorize?oauth_token=mock-oauth-token',
    oauth_token: 'mock-oauth-token',
    oauth_token_secret: 'mock-oauth-token-secret',
  });
  const TwitterApi = vi.fn().mockImplementation(() => ({ generateAuthLink }));
  return { generateAuthLink, TwitterApi };
});

vi.mock('twitter-api-v2', () => ({ TwitterApi }));

const { generateGoogleAuthUrl, OAuth2 } = vi.hoisted(() => {
  const generateGoogleAuthUrl = vi
    .fn()
    .mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
  const OAuth2 = vi.fn().mockImplementation(() => ({
    generateAuthUrl: generateGoogleAuthUrl,
  }));
  return { generateGoogleAuthUrl, OAuth2 };
});

vi.mock('googleapis', () => ({ google: { auth: { OAuth2 } } }));

interface OauthDataRow {
  project_id: string;
  provider: string;
  key: string;
  key_id: string;
  value: string;
}

describe('generateAuthUrl', () => {
  beforeEach(() => {
    generateAuthLink.mockClear();
    generateGoogleAuthUrl.mockClear();
    OAuth2.mockClear();
  });

  function buildConfigService(overrides: Record<string, string> = {}) {
    const values: Record<string, string> = {
      DASHBOARD_APP_URL: 'https://app.postforme.dev',
      ...overrides,
    };
    return {
      get: vi.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  function buildSupabaseService() {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const supabaseService = {
      supabaseClient: { from },
    } as unknown as SupabaseService;
    return { supabaseService, from, upsert };
  }

  function credentials(
    provider: Provider,
    overrides: Partial<SocialProviderAppCredentialsDto> = {},
  ): SocialProviderAppCredentialsDto {
    return {
      provider,
      projectId: 'project-1',
      appId: 'app-id-1',
      appSecret: 'app-secret-1',
      ...overrides,
    };
  }

  function baseArgs(overrides: {
    appCredentials: SocialProviderAppCredentialsDto;
    configService?: ConfigService;
    supabaseService?: SupabaseService;
    providerData?: AuthUrlProviderData | null;
    isSystem?: boolean;
    externalId?: string;
    redirectUrlOverride?: string | null;
    permissions?: string[];
  }) {
    const { supabaseService } = buildSupabaseService();
    return {
      projectId: 'project-1',
      isSystem: false,
      configService: buildConfigService(),
      supabaseService,
      providerData: null,
      externalId: undefined,
      redirectUrlOverride: undefined,
      permissions: [],
      ...overrides,
    };
  }

  it('builds a facebook auth URL with default scopes', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('facebook') }),
    );

    expect(url).toContain('https://www.facebook.com/v23.0/dialog/oauth?');
    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('client_id')).toBe('app-id-1');
    expect(params.get('redirect_uri')).toBe(
      'https://app.postforme.dev/callback/project-1/facebook/account',
    );
    expect(params.get('scope')).toBe(
      'public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,business_management',
    );
  });

  it('adds read_insights to facebook scopes when feeds permission requested', async () => {
    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        permissions: ['feeds'],
      }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toContain('read_insights');
  });

  it('uses permission_overrides for facebook scopes when provided', async () => {
    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        providerData: {
          facebook: { permission_overrides: ['custom_scope'] },
        },
      }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toBe('custom_scope');
  });

  it('respects a configured FACEBOOK_API_VERSION', async () => {
    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        configService: buildConfigService({ FACEBOOK_API_VERSION: 'v99.0' }),
      }),
    );

    expect(url).toContain('https://www.facebook.com/v99.0/dialog/oauth?');
  });

  it('maps instagram_w_facebook to the instagram callback segment and pushes a connection_type row', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('instagram_w_facebook'),
        supabaseService,
      }),
    );

    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    const connectionTypeRow = rows.find((row) => row.key === 'connection_type');
    expect(connectionTypeRow?.value).toBe('facebook');
  });

  it('builds an instagram auth URL with default scopes', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('instagram') }),
    );

    expect(url).toContain('https://www.instagram.com/oauth/authorize?');
    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toBe(
      'instagram_business_basic,instagram_business_content_publish',
    );
  });

  it('builds a tiktok auth URL with default scopes and version fallback', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('tiktok') }),
    );

    expect(url).toContain('https://www.tiktok.com/v2/auth/authorize/?');
    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('client_key')).toBe('app-id-1');
  });

  it('builds a tiktok_business auth URL with default scopes', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('tiktok_business') }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toContain('biz.spark.auth');
  });

  it('builds a pinterest auth URL with default scopes', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('pinterest') }),
    );

    expect(url).toContain('https://www.pinterest.com/oauth/?');
  });

  it('builds a threads auth URL and adds insights scope for feeds permission', async () => {
    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('threads'),
        permissions: ['feeds'],
      }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toBe(
      'threads_basic,threads_content_publish,threads_manage_insights',
    );
  });

  it('uses personal linkedin scopes by default', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('linkedin') }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toBe('openid w_member_social profile email');
  });

  it('uses organization linkedin scopes when connection_type is organization', async () => {
    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('linkedin'),
        providerData: {
          linkedin: { connection_type: 'organization' },
        },
      }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('scope')).toContain('r_organization_social');
  });

  it('sanitizes the bluesky handle and returns a handle/state query string', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('bluesky'),
        supabaseService,
        providerData: {
          bluesky: {
            handle: ' alice‎.bsky.social! ',
            app_password: 'app-password-1',
          },
        },
      }),
    );

    expect(url).toContain('handle=alice.bsky.social');
    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    const appPasswordRow = rows.find((row) => row.key === 'app_password');
    expect(appPasswordRow).toEqual(
      expect.objectContaining({
        key_id: 'alice.bsky.social',
        value: 'app-password-1',
      }),
    );
  });

  it('returns undefined for bluesky when handle/app_password are missing', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('bluesky') }),
    );

    expect(url).toBeUndefined();
  });

  it('builds a youtube auth URL via the google OAuth2 client', async () => {
    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('youtube') }),
    );

    expect(url).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
    expect(OAuth2).toHaveBeenCalledWith(
      'app-id-1',
      'app-secret-1',
      'https://app.postforme.dev/callback/project-1/youtube/account',
    );
    expect(generateGoogleAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: 'offline' }),
    );
  });

  it('builds an x (twitter) auth URL via the twitter client and records the oauth token secret', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    const url = await generateAuthUrl(
      baseArgs({ appCredentials: credentials('x'), supabaseService }),
    );

    expect(url).toBe(
      'https://api.twitter.com/oauth/authorize?oauth_token=mock-oauth-token',
    );
    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    const tokenRow = rows.find((row) => row.key === 'oauth_token');
    expect(tokenRow).toEqual(
      expect.objectContaining({
        key_id: 'mock-oauth-token',
        value: 'mock-oauth-token-secret',
      }),
    );
  });

  it('uses the system callback URL and records a project row when isSystem is true', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        supabaseService,
        isSystem: true,
      }),
    );

    expect(url).toContain(
      'redirect_uri=https%3A%2F%2Fapp.postforme.dev%2Fcallback%2Ffacebook%2Faccount',
    );
    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    expect(rows).toContainEqual(
      expect.objectContaining({ key: 'project', value: 'project-1' }),
    );
  });

  it('honors redirectUrlOverride as the callback URL and records a redirect_url row', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        supabaseService,
        redirectUrlOverride: 'https://custom.example.com/callback',
      }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('redirect_uri')).toBe(
      'https://custom.example.com/callback',
    );
    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    expect(rows).toContainEqual(
      expect.objectContaining({
        key: 'redirect_url',
        value: 'https://custom.example.com/callback',
      }),
    );
  });

  it('lets isSystem win over redirectUrlOverride for the final callback URL, while still recording the redirect_url row', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    const url = await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        supabaseService,
        isSystem: true,
        redirectUrlOverride: 'https://custom.example.com/callback',
      }),
    );

    const params = new URLSearchParams(url!.split('?')[1]);
    expect(params.get('redirect_uri')).toBe(
      'https://app.postforme.dev/callback/facebook/account',
    );
    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    expect(rows).toContainEqual(
      expect.objectContaining({
        key: 'redirect_url',
        value: 'https://custom.example.com/callback',
      }),
    );
  });

  it('records an external_id row when externalId is provided', async () => {
    const { supabaseService, upsert } = buildSupabaseService();

    await generateAuthUrl(
      baseArgs({
        appCredentials: credentials('facebook'),
        supabaseService,
        externalId: 'external-1',
      }),
    );

    const rows = upsert.mock.calls[0][0] as OauthDataRow[];
    expect(rows).toContainEqual(
      expect.objectContaining({ key: 'external_id', value: 'external-1' }),
    );
  });

  it('never calls upsert when there is no oauth data to record', async () => {
    const { supabaseService, upsert, from } = buildSupabaseService();

    await generateAuthUrl(
      baseArgs({ appCredentials: credentials('facebook'), supabaseService }),
    );

    expect(from).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});
