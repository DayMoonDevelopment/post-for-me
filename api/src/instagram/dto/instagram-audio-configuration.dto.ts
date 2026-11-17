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
