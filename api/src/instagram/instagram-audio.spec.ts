import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import type { SocialAccount } from '../lib/dto/global.dto';
import type { PlatformAudioQueryDto } from '../lib/dto/platform-audio-query.dto';
import type { SupabaseService } from '../supabase/supabase.service';
import { InstagramService } from './instagram.service';
import type { InstagramAudioAsset } from './instagram.types';

jest.mock('axios');
const get = jest.spyOn(axios, 'get');

describe('Instagram audio discovery', () => {
  let service: InstagramService;
  let account: SocialAccount;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new InstagramService({} as SupabaseService);
    account = {
      provider: 'instagram',
      id: 'account',
      social_provider_user_name: null,
      access_token: 'account-secret-token',
      refresh_token: null,
      access_token_expires_at: null,
      refresh_token_expires_at: null,
      social_provider_user_id: 'instagram-user-id',
      social_provider_metadata: { connection_type: 'facebook' },
    };
  });

  const music: InstagramAudioAsset = {
    audio_id: '587784541076604123',
    audio_type: 'music',
    title: 'Birthday Wish',
    display_artist: 'Shuba',
    duration_in_ms: 153760,
    cover_artwork_thumbnail_uri: 'https://cdn.example/artwork',
    download_url: 'https://cdn.example/preview',
    on_platform_audio_preview_link: 'https://www.instagram.com/audio/123',
    is_ads_eligible: false,
  };

  it('sends only documented filters with the supplied account credentials and normalizes music', async () => {
    get.mockResolvedValue({ data: { audio: [music] } });
    // Unknown query values must not be forwarded, even if validation is bypassed.
    const query = {
      platform_configurations: {
        instagram: {
          audio_type: 'music',
          search_query: 'birthday',
          access_token: 'caller-token',
          user_id: 'caller-user',
          limit: 1,
          after: 'cursor',
        },
      },
    } as PlatformAudioQueryDto;
    const result = await service.getPlatformAudio({ account, query });
    expect(get).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/ig_audio',
      {
        params: {
          audio_type: 'music',
          search_query: 'birthday',
          user_id: 'instagram-user-id',
          access_token: 'account-secret-token',
        },
      },
    );
    expect(result).toEqual({
      data: [
        {
          provider: 'instagram',
          id: music.audio_id,
          title: music.title,
          artist: music.display_artist,
          duration_ms: 153760,
          artwork_url: music.cover_artwork_thumbnail_uri,
          preview_url: music.download_url,
          platform_data: music,
        },
      ],
      meta: { count: 1, has_more: false, next: null },
    });
  });

  it.each([{}, { platform_configurations: { instagram: {} } }])(
    'defaults omitted audio_type to music and omits search for trending',
    async (query) => {
      get.mockResolvedValue({ data: { audio: [music] } });
      const result = await service.getPlatformAudio({
        account,
        query: query as PlatformAudioQueryDto,
      });
      expect(get.mock.calls[0][1]?.params).toEqual({
        audio_type: 'music',
        user_id: account.social_provider_user_id,
        access_token: account.access_token,
      });
      expect(result.meta.count).toBe(1);
    },
  );

  it('preserves original-sound creator metadata and nullable fields without fabricating common metadata', async () => {
    const original: InstagramAudioAsset = {
      audio_id: 'original-id',
      audio_type: 'original_sound',
      title: 'Original audio',
      duration_in_ms: 0,
      ig_username: 'creator',
      profile_picture_url: 'https://cdn.example/creator',
      download_url: null,
      cover_artwork_thumbnail_uri: null,
      on_platform_audio_preview_link: null,
      is_ads_eligible: null,
    };
    get.mockResolvedValue({ data: { audio: [original] } });
    const result = await service.getPlatformAudio({
      account,
      query: {
        platform_configurations: {
          instagram: { audio_type: 'original_sound' },
        },
      },
    });
    expect(get.mock.calls[0][1]?.params).toMatchObject({
      audio_type: 'original_sound',
    });
    expect(get.mock.calls[0][1]?.params).not.toHaveProperty('search_query');
    expect(result.data[0].platform_data).toEqual(original);
    expect(result.data[0].artist).toBeUndefined();
    expect(result.data[0].duration_ms).toBeUndefined();
    expect(result.data[0].preview_url).toBeUndefined();
    expect(result.data[0].artwork_url).toBeUndefined();
  });

  it('retains music nulls and true ads eligibility', async () => {
    const nullableMusic = {
      ...music,
      download_url: null,
      cover_artwork_thumbnail_uri: null,
      is_ads_eligible: true,
    };
    get.mockResolvedValue({ data: { audio: [nullableMusic] } });
    const result = await service.getPlatformAudio({ account, query: {} });
    expect(result.data[0].platform_data).toEqual(nullableMusic);
    expect(result.data[0].preview_url).toBeUndefined();
    expect(result.data[0].artwork_url).toBeUndefined();
  });

  it.each([{ audio: [] }, {}])('handles empty results: %j', async (data) => {
    get.mockResolvedValue({ data });
    await expect(
      service.getPlatformAudio({ account, query: {} }),
    ).resolves.toEqual({
      data: [],
      meta: { count: 0, has_more: false, next: null },
    });
  });

  it('does not copy or follow upstream paging URLs or unknown track fields', async () => {
    get.mockResolvedValue({
      data: {
        audio: [{ ...music, access_token: account.access_token }],
        paging: {
          next: `https://graph.facebook.com/ig_audio?access_token=${account.access_token}`,
          cursors: { after: 'unsupported' },
        },
      },
    });
    const result = await service.getPlatformAudio({ account, query: {} });
    expect(get).toHaveBeenCalledTimes(1);
    expect(result.meta).toEqual({ count: 1, has_more: false, next: null });
    expect(JSON.stringify(result)).not.toContain(account.access_token);
    expect(result.data[0].platform_data).toEqual(music);
  });

  it.each([
    { metadata: { connection_type: 'instagram' }, token: 'opaque-token' },
    { metadata: {}, token: 'IG-direct-token' },
    { metadata: { connection_type: 'facebook' }, token: 'IG-direct-token' },
  ])(
    'rejects Instagram Login before requesting audio: %j',
    async ({ metadata, token }) => {
      account.social_provider_metadata = metadata;
      account.access_token = token;
      const result = service.getPlatformAudio({ account, query: {} });
      await expect(result).rejects.toMatchObject({
        message:
          'Instagram audio discovery requires Facebook Login; Instagram Login connections are not supported',
        status: HttpStatus.BAD_REQUEST,
      });
      expect(get).not.toHaveBeenCalled();
    },
  );

  it('supports legacy Facebook accounts without connection metadata', async () => {
    account.social_provider_metadata = {};
    get.mockResolvedValue({ data: { audio: [] } });
    await service.getPlatformAudio({ account, query: {} });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each(['http', 'graph', 'network'])(
    'sanitizes %s provider failures',
    async (kind) => {
      const upstream = {
        error: {
          code: 190,
          message: `Invalid token ${account.access_token} at https://graph.facebook.com/ig_audio?access_token=${account.access_token}`,
        },
      };
      if (kind === 'graph') {
        get.mockResolvedValue({ data: upstream });
      } else if (kind === 'http') {
        get.mockRejectedValue({
          isAxiosError: true,
          response: { status: 401, data: upstream },
          config: { params: { access_token: account.access_token } },
        });
      } else {
        get.mockRejectedValue(new Error(upstream.error.message));
      }
      const logging = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const error: unknown = await service
          .getPlatformAudio({ account, query: {} })
          .catch((error: unknown) => error);
        expect(error).toBeInstanceOf(HttpException);
        if (error instanceof HttpException) {
          expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
          expect(error.getResponse()).toBe('Instagram audio discovery failed');
          expect(error.cause).toBeUndefined();
        }
        expect(JSON.stringify(error)).not.toContain(account.access_token);
        expect(JSON.stringify(error)).not.toContain('graph.facebook.com');
        expect(logging).not.toHaveBeenCalled();
      } finally {
        logging.mockRestore();
      }
    },
  );
});
