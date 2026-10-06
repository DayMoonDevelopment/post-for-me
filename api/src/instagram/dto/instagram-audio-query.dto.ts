import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, ValidateIf } from 'class-validator';

export class InstagramAudioQueryDto {
  @ApiPropertyOptional({ enum: ['music', 'original_sound'], default: 'music' })
  @IsIn(['music', 'original_sound'])
  audio_type: 'music' | 'original_sound' = 'music';

  @ApiPropertyOptional({ description: 'Omit to retrieve trending audio.' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  search_query?: string;
}
