import type { ValidationPipeOptions } from '@nestjs/common';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, ValidateIf, ValidateNested } from 'class-validator';
import { InstagramAudioQueryDto } from '../../instagram/dto/instagram-audio-query.dto';
import { TikTokBusinessAudioQueryDto } from '../../tiktok-business/dto/tiktok-business-audio-query.dto';

export const PLATFORM_AUDIO_VALIDATION_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
};

export class PlatformAudioConfigurationsDto {
  @ApiPropertyOptional({ type: InstagramAudioQueryDto })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => InstagramAudioQueryDto)
  instagram?: InstagramAudioQueryDto;

  @ApiPropertyOptional({ type: TikTokBusinessAudioQueryDto })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => TikTokBusinessAudioQueryDto)
  tiktok_business?: TikTokBusinessAudioQueryDto;
}

export class PlatformAudioQueryDto {
  // The controller documents scalar bracket parameters for correct query serialization.
  @ApiHideProperty()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PlatformAudioConfigurationsDto)
  platform_configurations?: PlatformAudioConfigurationsDto;
}
