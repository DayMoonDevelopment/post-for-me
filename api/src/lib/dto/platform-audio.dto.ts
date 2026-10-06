import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import type { SocialAccount } from './global.dto';
import type { PlatformAudioQueryDto } from './platform-audio-query.dto';

export class InstagramAudioPlatformDataDto {
  @ApiProperty({
    description: 'Publishable Instagram audio ID; always a string.',
  })
  audio_id: string;

  @ApiProperty({ enum: ['music', 'original_sound'] })
  audio_type: 'music' | 'original_sound';

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Provider duration in milliseconds.' })
  duration_in_ms?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  cover_artwork_thumbnail_uri?: string | null;

  @ApiPropertyOptional()
  display_artist?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Expires after approximately 1.5 days.',
  })
  download_url?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  on_platform_audio_preview_link?: string | null;

  @ApiPropertyOptional()
  ig_username?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  profile_picture_url?: string | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  is_ads_eligible?: boolean | null;
}

export class TikTokAudioClipDto {
  @ApiProperty({
    description:
      'Publishable clip ID for music_sound_id; NOT commercial_music_id.',
  })
  song_clip_id: string;

  @ApiPropertyOptional({
    description: 'Raw provider duration in seconds; zero may mean unknown.',
  })
  duration?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  preview_url?: string | null;
}

export class TikTokAudioTrendingHistoryDto {
  @ApiProperty({ description: 'YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  rank_position_daily?: string | null;
}

export class TikTokBusinessAudioPlatformDataDto {
  @ApiProperty({
    description: 'Discovery track ID, not a publishable sound clip ID.',
  })
  commercial_music_id: string;

  @ApiPropertyOptional()
  commercial_music_name?: string;

  @ApiPropertyOptional({
    description: 'Raw provider duration in seconds; zero may mean unknown.',
  })
  duration?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  thumbnail_url?: string | null;

  @ApiPropertyOptional()
  artist?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  preview_url?: string | null;

  @ApiPropertyOptional({ type: [String] })
  genres?: string[];

  @ApiPropertyOptional()
  rank_position?: string;

  @ApiPropertyOptional({ type: [TikTokAudioTrendingHistoryDto] })
  trending_history?: TikTokAudioTrendingHistoryDto[];

  @ApiPropertyOptional({ type: TikTokAudioClipDto, nullable: true })
  full_duration_song_clip?: TikTokAudioClipDto | null;

  @ApiPropertyOptional({ type: TikTokAudioClipDto, nullable: true })
  trending_song_clip?: TikTokAudioClipDto | null;
}

export class BasePlatformAudioDto {
  @ApiProperty({
    description: 'Opaque discovery resource ID. Not universally publishable.',
  })
  id: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({
    description:
      'Duration in milliseconds. Omitted when unknown, including TikTok duration=0.',
  })
  duration_ms?: number;

  @ApiPropertyOptional()
  artist?: string;

  @ApiPropertyOptional({
    description: 'Omitted when unavailable. May be temporary.',
  })
  preview_url?: string;

  @ApiPropertyOptional()
  artwork_url?: string;
}

export class InstagramPlatformAudioDto extends BasePlatformAudioDto {
  @ApiProperty({ enum: ['instagram'] })
  provider: 'instagram';

  @ApiProperty({ type: InstagramAudioPlatformDataDto })
  platform_data: InstagramAudioPlatformDataDto;
}

export class TikTokBusinessPlatformAudioDto extends BasePlatformAudioDto {
  @ApiProperty({ enum: ['tiktok_business'] })
  provider: 'tiktok_business';

  @ApiProperty({ type: TikTokBusinessAudioPlatformDataDto })
  platform_data: TikTokBusinessAudioPlatformDataDto;
}

export type PlatformAudio =
  | InstagramPlatformAudioDto
  | TikTokBusinessPlatformAudioDto;

export class PlatformAudioMetaDto {
  @ApiProperty({
    description: 'Number of items in this response, not an upstream total.',
  })
  count: number;

  @ApiProperty({
    enum: [false],
    description:
      'No pagination documented for the supported discovery endpoints.',
  })
  has_more: false;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Always null until upstream pagination is verified.',
  })
  next: null;
}

export class PlatformAudioResponseDto {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(InstagramPlatformAudioDto) },
        { $ref: getSchemaPath(TikTokBusinessPlatformAudioDto) },
      ],
    },
  })
  data: PlatformAudio[];

  @ApiProperty({ type: PlatformAudioMetaDto })
  meta: PlatformAudioMetaDto;
}

export interface GetPlatformAudioParams {
  account: SocialAccount;
  query: PlatformAudioQueryDto;
}

/** Normalize known positive provider durations without manufacturing missing metadata. */
export function platformAudioDurationMs(
  duration: number | null | undefined,
  unit: 'seconds' | 'milliseconds',
): number | undefined {
  if (duration == null || !Number.isFinite(duration) || duration <= 0)
    return undefined;
  const milliseconds = unit === 'seconds' ? duration * 1000 : duration;
  return Number.isSafeInteger(milliseconds) ? milliseconds : undefined;
}
