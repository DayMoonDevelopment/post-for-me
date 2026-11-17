import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class TikTokBusinessMusicSoundInfoDto {
  @ApiProperty({
    description:
      'For videos, song_clip_id from full_duration_song_clip or trending_song_clip. For photo posts, the commercial music library track ID.',
  })
  @IsString()
  @Matches(/\S/)
  music_sound_id: string;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    default: 50,
    description:
      'Video music volume. Defaults to 50 when omitted; ignored for photo posts.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  music_sound_volume?: number;

  @ApiPropertyOptional({
    minimum: 0,
    default: 0,
    description: 'Start offset in milliseconds.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  music_sound_start?: number;

  @ApiPropertyOptional({
    minimum: 0,
    description:
      'End offset in milliseconds. Defaults upstream to video duration; must exceed start.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  music_sound_end?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  video_original_sound_volume?: number;
}
