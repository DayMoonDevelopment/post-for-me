import type { ConfigService } from '@nestjs/config';
import type { SupabaseService } from '../../supabase/supabase.service';
import type { SocialProviderAppCredentialsDto } from '../../social-provider-app-credentials/dto/social-provider-app-credentials.dto';
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
  };

  const appCredentials = (
    provider: SocialProviderAppCredentialsDto['provider'],
  ): SocialProviderAppCredentialsDto => ({
    provider,
    projectId: 'project-1',
    appId: 'app-id',
    appSecret: 'app-secret',
  });

  it('includes auth_type=rerequest for facebook', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('facebook'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBe('rerequest');
  });

  it('includes auth_type=rerequest for instagram_w_facebook', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('instagram_w_facebook'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBe('rerequest');
  });

  it('does not add auth_type for native instagram, and leaves force_reauth untouched', async () => {
    const authUrl = await generateAuthUrl({
      ...baseArgs,
      appCredentials: appCredentials('instagram'),
    });

    const params = new URL(authUrl!).searchParams;
    expect(params.get('auth_type')).toBeNull();
    expect(params.get('force_reauth')).toBe('false');
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
