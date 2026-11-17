import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasePlatformAudioDto } from '../../lib/dto/base-platform-audio.dto';

export class TikTokAudioClipDto {
  @ApiProperty({
    description:
      'Publishable clip ID for music_sound_id; NOT commercial_music_id.',
  })
  song_clip_id: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Raw provider duration in seconds; zero may mean unknown.',
  })
  duration?: number | null;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  commercial_music_name?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Raw provider duration in seconds; zero may mean unknown.',
  })
  duration?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  thumbnail_url?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  artist?: string | null;

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

export class TikTokBusinessPlatformAudioDto extends BasePlatformAudioDto {
  @ApiProperty({ enum: ['tiktok_business'] })
  provider: 'tiktok_business';

  @ApiProperty({ type: TikTokBusinessAudioPlatformDataDto })
  platform_data: TikTokBusinessAudioPlatformDataDto;
}
