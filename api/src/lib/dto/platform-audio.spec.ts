import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PLATFORM_AUDIO_VALIDATION_OPTIONS,
  PlatformAudioQueryDto,
} from './platform-audio-query.dto';
import { InstagramAudioQueryDto } from '../../instagram/dto/instagram-audio-query.dto';
import {
  TikTokBusinessAudioQueryDto,
  TIKTOK_BUSINESS_AUDIO_GENRES,
} from '../../tiktok-business/dto/tiktok-business-audio-query.dto';
import { InstagramAudioConfigurationDto } from '../../instagram/dto/instagram-audio-configuration.dto';
import { TikTokBusinessMusicSoundInfoDto } from '../../tiktok-business/dto/tiktok-business-music-sound-info.dto';
import { platformAudioDurationMs } from './platform-audio.dto';
import type {
  PlatformAudio,
  PlatformAudioResponseDto,
} from './platform-audio.dto';

describe('platform audio query contract', () => {
  const pipe = new ValidationPipe(PLATFORM_AUDIO_VALIDATION_OPTIONS);
  const transform = (query: unknown): Promise<PlatformAudioQueryDto> =>
    pipe.transform(query, {
      type: 'query',
      metatype: PlatformAudioQueryDto,
    }) as Promise<PlatformAudioQueryDto>;

  it('validates nested objects and applies provider defaults', async () => {
    const query = await transform({
      platform_configurations: { instagram: {}, tiktok_business: {} },
    });
    expect(query.platform_configurations?.instagram).toBeInstanceOf(
      InstagramAudioQueryDto,
    );
    expect(query.platform_configurations?.instagram?.audio_type).toBe('music');
    expect(query.platform_configurations?.tiktok_business).toEqual({
      country_code: 'US',
      date_range: '7DAY',
      genre: 'ALL',
    });
    expect(new TikTokBusinessAudioQueryDto()).toEqual(
      query.platform_configurations?.tiktok_business,
    );
    expect(await transform({})).toEqual({});
  });

  it('accepts documented provider filters', async () => {
    const filters = {
      instagram: { audio_type: 'original_sound', search_query: 'birthday' },
      tiktok_business: {
        country_code: 'GB',
        date_range: '90DAY',
        genre: 'HIP_HOP/RAP',
      },
    };
    expect(
      (await transform({ platform_configurations: filters }))
        .platform_configurations,
    ).toEqual(filters);
  });

  it.each(TIKTOK_BUSINESS_AUDIO_GENRES)(
    'accepts documented genre %s',
    async (genre) => {
      await expect(
        transform({ platform_configurations: { tiktok_business: { genre } } }),
      ).resolves.toBeDefined();
    },
  );

  it.each([
    { platform_configurations: 'not-an-object' },
    { platform_configurations: null },
    { platform_configurations: [] },
    { platform_configurations: { instagram: [] } },
    { platform_configurations: { instagram: null } },
    { platform_configurations: { instagram: { audio_type: 'podcast' } } },
    { platform_configurations: { instagram: { audio_type: null } } },
    { platform_configurations: { instagram: { search_query: ['a', 'b'] } } },
    { platform_configurations: { instagram: { search_query: 123 } } },
    { platform_configurations: { instagram: { search_query: null } } },
    { platform_configurations: { instagram: { user_id: 'caller-account' } } },
    { platform_configurations: { tiktok_business: 'bad' } },
    { platform_configurations: { tiktok_business: { date_range: '120DAY' } } },
    { platform_configurations: { tiktok_business: { date_range: ['7DAY'] } } },
    { platform_configurations: { tiktok_business: { genre: 'invented' } } },
    { platform_configurations: { tiktok_business: { genre: null } } },
    { platform_configurations: { tiktok_business: { country_code: 'us' } } },
    { platform_configurations: { tiktok_business: { country_code: 'ZZ' } } },
    { platform_configurations: { tiktok_business: { country_code: null } } },
    {
      platform_configurations: {
        tiktok_business: { search_query: 'not-supported' },
      },
    },
    {
      platform_configurations: { tiktok_business: { access_token: 'secret' } },
    },
    { platform_configurations: { youtube: {} } },
    { cursor: 'invented' },
    { limit: '100' },
    { search_query: 'unscoped' },
  ])('rejects malformed or unsupported query %p', async (query) => {
    await expect(transform(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('platform audio IDs and duration', () => {
  it('keeps discovery IDs distinct from publishable clip IDs without numeric coercion', async () => {
    const trackId = '99999999999999999999';
    const clipId = '88888888888888888888';
    const track: PlatformAudio = {
      provider: 'tiktok_business',
      id: trackId,
      duration_ms: platformAudioDurationMs(123, 'seconds'),
      platform_data: {
        commercial_music_id: trackId,
        duration: 123,
        full_duration_song_clip: { song_clip_id: clipId, duration: 123 },
        trending_song_clip: null,
      },
    };
    const selection = plainToInstance(TikTokBusinessMusicSoundInfoDto, {
      music_sound_id: track.platform_data.full_duration_song_clip?.song_clip_id,
      music_sound_volume: 50,
    });
    expect(await validate(selection)).toEqual([]);
    expect(selection.music_sound_id).toBe(clipId);
    expect(selection.music_sound_id).not.toBe(track.id);
    expect(track.duration_ms).toBe(123000);
    expect(track.platform_data.duration).toBe(123);

    const instagram = plainToInstance(InstagramAudioConfigurationDto, {
      audio_id: trackId,
    });
    expect(await validate(instagram)).toEqual([]);
    expect(instagram.audio_id).toBe(trackId);
  });

  it('normalizes both providers to the same millisecond unit', () => {
    expect(platformAudioDurationMs(153760, 'milliseconds')).toBe(153760);
    expect(platformAudioDurationMs(153, 'seconds')).toBe(153000);
    expect(platformAudioDurationMs(1, 'seconds')).toBe(1000);
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    NaN,
    Infinity,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('does not invent a duration for %p', (duration) => {
    expect(platformAudioDurationMs(duration, 'milliseconds')).toBeUndefined();
  });

  it('permits unavailable metadata and a non-paginated envelope', () => {
    const response: PlatformAudioResponseDto = {
      data: [
        {
          provider: 'instagram',
          id: '123',
          platform_data: {
            audio_id: '123',
            audio_type: 'original_sound',
            download_url: null,
            is_ads_eligible: null,
          },
        },
      ],
      meta: { count: 1, has_more: false, next: null },
    };
    expect(response.data[0].duration_ms).toBeUndefined();
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
    // @ts-expect-error IDs must not become numbers.
    const invalidId: PlatformAudio['id'] = 123;
    // @ts-expect-error No invented pagination is allowed by this contract.
    const invalidPagination: PlatformAudioResponseDto['meta']['has_more'] = true;
    expect(invalidId).toBe(123);
    expect(invalidPagination).toBe(true);
    const mismatchedProvider: PlatformAudio = {
      provider: 'instagram',
      id: '123',
      platform_data: {
        audio_id: '123',
        audio_type: 'music',
        // @ts-expect-error TikTok-specific fields cannot be attached to Instagram data.
        commercial_music_id: '456',
      },
    };
    expect(mismatchedProvider.provider).toBe('instagram');
  });
});

describe('audio publishing selection validation', () => {
  it.each([
    {},
    { audio_id: 123 },
    { audio_id: '' },
    { audio_id: ' ' },
    { audio_id: '123', audio_volume: -1 },
    { audio_id: '123', video_volume: 101 },
    { audio_id: '123', video_volume: 1.5 },
    { audio_id: '123', audio_volume: null },
  ])('rejects malformed Instagram selection %p', async (input) => {
    expect(
      await validate(plainToInstance(InstagramAudioConfigurationDto, input)),
    ).not.toHaveLength(0);
  });

  it.each([
    {},
    { music_sound_id: 123, music_sound_volume: 50 },
    { music_sound_id: '123' },
    { music_sound_id: '', music_sound_volume: 50 },
    { music_sound_id: '123', music_sound_volume: 101 },
    { music_sound_id: '123', music_sound_volume: 50, music_sound_start: -1 },
    { music_sound_id: '123', music_sound_volume: 50, music_sound_end: 1.5 },
    {
      music_sound_id: '123',
      music_sound_volume: 50,
      video_original_sound_volume: 101,
    },
  ])('rejects malformed TikTok selection %p', async (input) => {
    expect(
      await validate(plainToInstance(TikTokBusinessMusicSoundInfoDto, input)),
    ).not.toHaveLength(0);
  });

  it('preserves integer millisecond offsets and zero volumes', async () => {
    const selection = plainToInstance(TikTokBusinessMusicSoundInfoDto, {
      music_sound_id: '123',
      music_sound_volume: 0,
      music_sound_start: 2000,
      music_sound_end: 4000,
      video_original_sound_volume: 0,
    });
    expect(await validate(selection)).toEqual([]);
    expect(selection.music_sound_start).toBe(2000);
  });
});
