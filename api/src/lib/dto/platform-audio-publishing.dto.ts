import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class InstagramAudioConfigurationDto {
  @ApiProperty({
    description: 'Instagram audio_id from discovery, retained as a string.',
  })
  @IsString()
  @Matches(/\S/)
  audio_id: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  audio_volume?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  video_volume?: number;
}

export class TikTokBusinessMusicSoundInfoDto {
  @ApiProperty({
    description:
      'song_clip_id from full_duration_song_clip or trending_song_clip; never commercial_music_id.',
  })
  @IsString()
  @Matches(/\S/)
  music_sound_id: string;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description:
      'Required when selecting a sound. Send explicitly; provider default is 0.',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  music_sound_volume: number;

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
