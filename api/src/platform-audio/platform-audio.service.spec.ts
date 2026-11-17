import { BadRequestException, HttpException } from '@nestjs/common';
import { PlatformAudioService } from './platform-audio.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { InstagramService } from '../instagram/instagram.service';
import type { TikTokBusinessService } from '../tiktok-business/tiktok-business.service';
import type { SocialAccount } from '../lib/dto/global.dto';
import { InstagramAudioQueryDto } from '../instagram/dto/instagram-audio-query.dto';
import { TikTokBusinessAudioQueryDto } from '../tiktok-business/dto/tiktok-business-audio-query.dto';

describe('PlatformAudioService', () => {
  const account = {
    id: 'sa_123',
    provider: 'instagram',
    access_token: 'facebook-secret',
    refresh_token: 'refresh-secret',
    access_token_expires_at: '2099-01-01T00:00:00.000Z' as string | null,
    refresh_token_expires_at: null,
    social_provider_user_id: 'provider-user',
    social_provider_user_name: 'user',
    social_provider_metadata: { connection_type: 'facebook' },
  };
  const audio = {
    provider: 'instagram',
    id: '9007199254740993',
    duration_ms: 1234,
    platform_data: {
      audio_id: '9007199254740993',
      audio_type: 'music',
      download_url: null,
    },
  };
  let lookup: { data: typeof account | null; error: unknown };
  let persistence: { error: unknown };
  const select = jest.fn();
  const eq = jest.fn();
  const update = jest.fn();
  const updateEq = jest.fn();
  const instagram = {
    initService: jest.fn(),
    initFacebookService: jest.fn(),
    refreshAccessToken: jest.fn(),
    getPlatformAudio: jest.fn(),
  };
  const tiktok = {
    initService: jest.fn(),
    refreshAccessToken: jest.fn(),
    getPlatformAudio: jest.fn(),
  };
  let service: PlatformAudioService;
  const request = { accountId: 'sa_123', projectId: 'project-1', query: {} };

  beforeEach(() => {
    jest.resetAllMocks();
    lookup = { data: { ...account }, error: null };
    persistence = { error: null };
    const readBuilder = {
      eq,
      maybeSingle: jest.fn(() =>
        Promise.resolve(
          eq.mock.calls.some(
            ([column, value]: unknown[]) =>
              column === 'project_id' && value === 'project-1',
          )
            ? lookup
            : { data: null, error: null },
        ),
      ),
    };
    select.mockReturnValue(readBuilder);
    eq.mockReturnValue(readBuilder);
    // The second scope predicate executes the update.
    update.mockReturnValue({ eq: updateEq });
    updateEq.mockImplementation(() => ({
      eq: jest.fn(() => Promise.resolve(persistence)),
    }));
    instagram.getPlatformAudio.mockResolvedValue({
      data: [audio],
      meta: {
        count: 100,
        has_more: true,
        next: 'https://provider/?token=secret',
      },
    });
    tiktok.getPlatformAudio.mockResolvedValue({ data: [], meta: {} });
    service = new PlatformAudioService(
      {
        supabaseClient: { from: jest.fn(() => ({ select, update })) },
      } as unknown as SupabaseService,
      instagram as unknown as InstagramService,
      tiktok as unknown as TikTokBusinessService,
    );
  });

  it('scopes account lookup by ID and caller project, dispatches Facebook Login and maps the envelope', async () => {
    const result = await service.getPlatformAudio(request);
    expect(eq.mock.calls).toEqual([
      ['id', 'sa_123'],
      ['project_id', 'project-1'],
    ]);
    expect(instagram.initFacebookService).toHaveBeenCalledWith('project-1');
    expect(instagram.initService).not.toHaveBeenCalled();
    expect(instagram.refreshAccessToken).not.toHaveBeenCalled();
    expect(instagram.getPlatformAudio).toHaveBeenCalledWith({
      account: expect.objectContaining({
        access_token: account.access_token,
      }) as unknown,
      query: {
        platform_configurations: { instagram: { audio_type: 'music' } },
      },
    });
    expect(result).toEqual({
      data: [audio],
      meta: { count: 1, has_more: false, next: null },
    });
    expect(JSON.stringify(result)).not.toContain(account.access_token);
  });

  it.each(['missing', 'cross-project'])(
    'rejects %s accounts without provider calls',
    async (scenario) => {
      if (scenario === 'missing') lookup.data = null;
      await expect(
        service.getPlatformAudio({
          ...request,
          projectId:
            scenario === 'cross-project'
              ? 'another-project'
              : request.projectId,
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Social account not found',
      });
      expect(instagram.initFacebookService).not.toHaveBeenCalled();
      expect(tiktok.initService).not.toHaveBeenCalled();
      expect(instagram.getPlatformAudio).not.toHaveBeenCalled();
    },
  );

  it('does not expose database errors', async () => {
    lookup.error = { message: account.access_token };
    await expect(service.getPlatformAudio(request)).rejects.toMatchObject({
      status: 500,
      message: 'Unable to fetch social account',
    });
  });

  it.each([
    { provider: 'tiktok' },
    { provider: 'unknown' },
    { social_provider_metadata: { connection_type: 'instagram' } },
    { access_token: 'IG-secret' },
  ])(
    'rejects unsupported platform/connection %j before initialization',
    async (overrides) => {
      lookup.data = { ...account, ...overrides };
      await expect(service.getPlatformAudio(request)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(instagram.initFacebookService).not.toHaveBeenCalled();
      expect(tiktok.initService).not.toHaveBeenCalled();
    },
  );

  it('passes nested TikTok filters through to the selected service and supports empty results', async () => {
    lookup.data = { ...account, provider: 'tiktok_business' };
    const query = {
      platform_configurations: {
        tiktok_business: {
          country_code: 'GB',
          date_range: '30DAY' as const,
          genre: 'FOLK' as const,
        },
      },
    };
    expect(await service.getPlatformAudio({ ...request, query })).toEqual({
      data: [],
      meta: { count: 0, has_more: false, next: null },
    });
    expect(tiktok.initService).toHaveBeenCalledWith('project-1');
    expect(tiktok.getPlatformAudio).toHaveBeenCalledWith({
      account: expect.objectContaining({
        provider: 'tiktok_business',
      }) as unknown,
      query,
    });
  });

  it('applies TikTok defaults when no configuration is supplied', async () => {
    lookup.data = { ...account, provider: 'tiktok_business' };
    await service.getPlatformAudio(request);
    expect(tiktok.getPlatformAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          platform_configurations: {
            tiktok_business: {
              country_code: 'US',
              date_range: '7DAY',
              genre: 'ALL',
            },
          },
        },
      }),
    );
  });

  it.each([
    { tiktok_business: new TikTokBusinessAudioQueryDto() },
    {
      instagram: new InstagramAudioQueryDto(),
      tiktok_business: new TikTokBusinessAudioQueryDto(),
    },
  ])(
    'rejects mismatched or multiple provider configurations',
    async (platform_configurations) => {
      await expect(
        service.getPlatformAudio({
          ...request,
          query: { platform_configurations },
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(instagram.initFacebookService).not.toHaveBeenCalled();
    },
  );

  it.each(['2020-01-01T00:00:00.000Z', null])(
    'refreshes expired/unknown expiry %s and uses/persists rotated credentials',
    async (expiry) => {
      lookup.data = {
        ...account,
        access_token_expires_at: expiry,
      };
      instagram.refreshAccessToken.mockImplementation(
        (original: SocialAccount) =>
          Promise.resolve({
            ...original,
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            access_token_expires_at: new Date('2099-02-01T00:00:00.000Z'),
            refresh_token_expires_at: new Date('2099-03-01T00:00:00.000Z'),
          }),
      );
      await service.getPlatformAudio(request);
      expect(update).toHaveBeenCalledWith({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        access_token_expires_at: '2099-02-01T00:00:00.000Z',
        refresh_token_expires_at: '2099-03-01T00:00:00.000Z',
      });
      expect(updateEq).toHaveBeenCalledWith('id', request.accountId);
      const scopedUpdate = updateEq.mock.results[0].value as { eq: jest.Mock };
      expect(scopedUpdate.eq).toHaveBeenCalledWith(
        'project_id',
        request.projectId,
      );
      expect(instagram.getPlatformAudio).toHaveBeenCalledWith(
        expect.objectContaining({
          account: expect.objectContaining({
            access_token: 'new-token',
          }) as unknown,
        }),
      );
    },
  );

  it('retains credentials if the provider does not rotate them', async () => {
    lookup.data = { ...account, access_token_expires_at: '2020-01-01' };
    instagram.refreshAccessToken.mockResolvedValue(null);
    await service.getPlatformAudio(request);
    expect(update).not.toHaveBeenCalled();
    expect(instagram.getPlatformAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({
          access_token: account.access_token,
        }) as unknown,
      }),
    );
  });

  it('refreshes TikTok proactively and uses the rotated token in discovery', async () => {
    lookup.data = {
      ...account,
      provider: 'tiktok_business',
      access_token_expires_at: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
    tiktok.refreshAccessToken.mockImplementation((original: SocialAccount) =>
      Promise.resolve({
        ...original,
        access_token: 'rotated-tiktok',
        refresh_token: 'rotated-refresh',
      }),
    );
    await service.getPlatformAudio(request);
    expect(tiktok.refreshAccessToken).toHaveBeenCalled();
    expect(tiktok.getPlatformAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({
          access_token: 'rotated-tiktok',
        }) as unknown,
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: 'rotated-tiktok' }),
    );
  });

  it('retains an upstream HttpException status but removes credential-bearing messages', async () => {
    instagram.getPlatformAudio.mockRejectedValue(
      new HttpException(
        {
          message: `Provider failed: ${account.access_token}`,
          token: account.refresh_token,
        },
        429,
      ),
    );
    await expect(service.getPlatformAudio(request)).rejects.toMatchObject({
      status: 429,
      message: 'Unable to retrieve platform audio',
    });
  });

  it('stops discovery when rotated credentials cannot be persisted', async () => {
    lookup.data = { ...account, access_token_expires_at: '2020-01-01' };
    instagram.refreshAccessToken.mockImplementation((original: SocialAccount) =>
      Promise.resolve(original),
    );
    persistence.error = { message: 'secret' };
    await expect(service.getPlatformAudio(request)).rejects.toMatchObject({
      status: 500,
    });
    expect(instagram.getPlatformAudio).not.toHaveBeenCalled();
  });

  it.each([
    'initFacebookService',
    'refreshAccessToken',
    'getPlatformAudio',
  ] as const)('preserves HttpExceptions from %s', async (operation) => {
    lookup.data = { ...account, access_token_expires_at: '2020-01-01' };
    const error = new HttpException(
      'Platform audio is not supported for this platform',
      400,
    );
    instagram[operation].mockRejectedValue(error);
    await expect(service.getPlatformAudio(request)).rejects.toBe(error);
  });

  it.each([
    'initFacebookService',
    'refreshAccessToken',
    'getPlatformAudio',
  ] as const)(
    'sanitizes untrusted provider failures from %s',
    async (operation) => {
      lookup.data = { ...account, access_token_expires_at: '2020-01-01' };
      instagram[operation].mockRejectedValue(
        new Error(`access_token=${account.access_token}`),
      );
      await expect(service.getPlatformAudio(request)).rejects.toMatchObject({
        status: 502,
        message: 'Unable to retrieve platform audio',
      });
    },
  );
});
