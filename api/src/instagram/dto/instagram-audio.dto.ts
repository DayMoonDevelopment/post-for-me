import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasePlatformAudioDto } from '../../lib/dto/base-platform-audio.dto';

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

export class InstagramPlatformAudioDto extends BasePlatformAudioDto {
  @ApiProperty({ enum: ['instagram'] })
  provider: 'instagram';

  @ApiProperty({ type: InstagramAudioPlatformDataDto })
  platform_data: InstagramAudioPlatformDataDto;
}
