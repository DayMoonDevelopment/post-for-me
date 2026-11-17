import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import type { SocialAccount } from '../lib/dto/global.dto';
import type { PlatformAudioQueryDto } from '../lib/dto/platform-audio-query.dto';
import type { SupabaseService } from '../supabase/supabase.service';
import { TikTokService } from '../tiktok/tiktok.service';
import { TIKTOK_BUSINESS_AUDIO_GENRES } from './dto/tiktok-business-audio-query.dto';
import type { TikTokBusinessAudioPlatformDataDto } from './dto/tiktok-business-audio.dto';
import { TikTokBusinessService } from './tiktok-business.service';

jest.mock('axios');
const get = jest.spyOn(axios, 'get');

describe('TikTok Business Commercial Music Library discovery', () => {
  const account: SocialAccount = {
    provider: 'tiktok_business',
    id: 'account',
    social_provider_user_name: null,
    access_token: 'account-secret',
    refresh_token: null,
    access_token_expires_at: null,
    refresh_token_expires_at: null,
    social_provider_user_id: 'account-open-id',
    social_provider_metadata: {},
  };
  let service: TikTokBusinessService;
  const discover = (query: unknown = {}) =>
    service.getPlatformAudio({
      account,
      query: query as PlatformAudioQueryDto,
    });
  const success = (list: TikTokBusinessAudioPlatformDataDto[] | null = []) =>
    get.mockResolvedValue({ data: { code: 0, message: 'OK', data: { list } } });

  beforeEach(() => {
    jest.resetAllMocks();
    // Discovery uses only the supplied account, not application credentials or DB state.
    service = new TikTokBusinessService({} as SupabaseService);
    success();
  });

  it('uses the account credentials and documented defaults without pagination', async () => {
    await expect(discover()).resolves.toEqual({
      data: [],
      meta: { count: 0, has_more: false, next: null },
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      'https://business-api.tiktok.com/open_api/v1.3/discovery/cml/trending_list/',
      {
        headers: { 'Access-Token': 'account-secret' },
        params: {
          business_id: 'account-open-id',
          country_code: 'US',
          date_range: '7DAY',
          genre: 'ALL',
        },
      },
    );
  });

  it.each(['1DAY', '7DAY', '30DAY', '90DAY'])(
    'passes date_range %s',
    async (date_range) => {
      await discover({
        platform_configurations: {
          tiktok_business: {
            country_code: 'GB',
            date_range,
            genre: 'R&B/SOUL',
          },
        },
      });
      expect(get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            business_id: 'account-open-id',
            country_code: 'GB',
            date_range,
            genre: 'R&B/SOUL',
          },
        }),
      );
    },
  );

  it.each(TIKTOK_BUSINESS_AUDIO_GENRES)(
    'accepts documented genre %s',
    async (genre) => {
      await discover({
        platform_configurations: { tiktok_business: { genre } },
      });
      expect(get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            business_id: 'account-open-id',
            country_code: 'US',
            date_range: '7DAY',
            genre,
          },
        }),
      );
    },
  );

  it.each([
    { country_code: 'us' },
    { country_code: 'ZZ' },
    { country_code: null },
    { country_code: ['US'] },
    { date_range: 'WEEK' },
    { date_range: null },
    { genre: 'Folk' },
    { genre: null },
    { genre: ['FOLK'] },
    { business_id: 'caller-id' },
    { access_token: 'caller-token' },
    { search_query: 'song' },
    { limit: 10 },
    { cursor: 'next' },
  ])(
    'rejects invalid/unsupported filters %j before requesting',
    async (filters) => {
      await expect(
        discover({ platform_configurations: { tiktok_business: filters } }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
      expect(get).not.toHaveBeenCalled();
    },
  );

  it.each([
    { platform_configurations: null },
    { platform_configurations: { tiktok_business: null } },
    { platform_configurations: { tiktok_business: [] } },
    { platform_configurations: { instagram: {} } },
    { platform_configurations: { instagram: {}, tiktok_business: {} } },
    { platform_configurations: { tiktok: {} } },
    { cursor: 'next' },
  ])('rejects malformed/mismatched configurations %j', async (query) => {
    await expect(discover(query)).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
    expect(get).not.toHaveBeenCalled();
  });

  it('maps discovery IDs and shared metadata while retaining both distinct publishable clips', async () => {
    const track: TikTokBusinessAudioPlatformDataDto = {
      commercial_music_id: '9223372036854775807',
      commercial_music_name: 'Track',
      artist: 'Artist',
      duration: 123,
      preview_url: 'https://example.com/track.mp3',
      thumbnail_url: 'https://example.com/art.jpg',
      genres: ['Folk', 'Indie_Folk'],
      rank_position: '100',
      trending_history: [{ date: '2026-10-06', rank_position_daily: null }],
      full_duration_song_clip: {
        song_clip_id: '9223372036854775806',
        duration: 123,
        preview_url: 'https://example.com/full.mp3',
      },
      trending_song_clip: {
        song_clip_id: '9223372036854775805',
        duration: 30,
        preview_url: 'https://example.com/trending.mp3',
      },
    };
    success([track]);
    await expect(discover()).resolves.toEqual({
      data: [
        {
          provider: 'tiktok_business',
          id: track.commercial_music_id,
          title: 'Track',
          artist: 'Artist',
          duration_ms: 123000,
          preview_url: track.preview_url,
          artwork_url: track.thumbnail_url,
          platform_data: track,
        },
      ],
      meta: { count: 1, has_more: false, next: null },
    });
  });

  it.each([0, null, undefined, -1, NaN, Infinity])(
    'omits unknown duration %s and empty metadata, retaining native nulls',
    async (duration) => {
      const track: TikTokBusinessAudioPlatformDataDto = {
        commercial_music_id: 'track',
        commercial_music_name: null,
        artist: '',
        duration,
        preview_url: null,
        thumbnail_url: ' ',
        full_duration_song_clip: null,
        trending_song_clip: {
          song_clip_id: 'clip',
          duration: null,
          preview_url: null,
        },
      };
      success([track]);
      const result = await discover();
      expect(result.data).toEqual([
        { provider: 'tiktok_business', id: 'track', platform_data: track },
      ]);
    },
  );

  it('does not manufacture clips or shared metadata from clip fields', async () => {
    const tracks: TikTokBusinessAudioPlatformDataDto[] = [
      { commercial_music_id: 'minimal' },
      {
        commercial_music_id: 'clip-only',
        trending_song_clip: {
          song_clip_id: 'sound',
          duration: 30,
          preview_url: 'https://example.com/clip.mp3',
        },
      },
    ];
    success(tracks);
    expect((await discover()).data).toEqual(
      tracks.map((track) => ({
        provider: 'tiktok_business',
        id: track.commercial_music_id,
        platform_data: track,
      })),
    );
  });

  it('returns all 100 tracks without truncating or inventing cursors', async () => {
    success(
      Array.from({ length: 100 }, (_, i) => ({ commercial_music_id: `${i}` })),
    );
    const result = await discover();
    expect(result.data).toHaveLength(100);
    expect(result.meta).toEqual({ count: 100, has_more: false, next: null });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('handles a null list as empty', async () => {
    success(null);
    expect((await discover()).meta).toEqual({
      count: 0,
      has_more: false,
      next: null,
    });
  });

  it.each([40001, 20001, 50000])(
    'rejects nonzero provider code %s even on HTTP 200',
    async (code) => {
      get.mockResolvedValue({
        status: 200,
        data: { code, message: 'account-secret', data: null },
      });
      await expect(discover()).rejects.toMatchObject({
        status: HttpStatus.BAD_GATEWAY,
        message:
          'Unable to get TikTok Business audio: provider returned an error',
      });
    },
  );

  it.each(['network failure', 'HTTP 401', 'HTTP 429', 'HTTP 500'])(
    'handles %s without leaking credentials',
    async (message) => {
      get.mockRejectedValue(new Error(`${message}: account-secret`));
      await expect(discover()).rejects.toMatchObject({
        status: HttpStatus.BAD_GATEWAY,
        message: 'Unable to get TikTok Business audio',
      });
    },
  );

  it.each([
    {},
    { code: '0' },
    { code: 0, data: null },
    { code: 0, data: {} },
    { code: 0, data: { list: {} } },
    { code: 0, data: { list: [null] } },
    { code: 0, data: { list: [{ commercial_music_id: 123 }] } },
  ])('rejects malformed upstream response %j', async (data) => {
    get.mockResolvedValue({ data });
    await expect(discover()).rejects.toMatchObject({
      status: HttpStatus.BAD_GATEWAY,
    });
  });

  it('leaves regular TikTok explicitly unsupported', async () => {
    await expect(
      TikTokService.prototype.getPlatformAudio({
        account: { ...account, provider: 'tiktok' },
        query: {},
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'Platform audio is not supported for this platform',
    });
    expect(get).not.toHaveBeenCalled();
  });
});
