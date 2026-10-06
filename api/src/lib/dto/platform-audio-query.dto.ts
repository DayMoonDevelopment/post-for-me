import type { ValidationPipeOptions } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO31661Alpha2,
  IsObject,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// Snapshot of the official CML genre enum, verified 2026-10-06.
export const TIKTOK_BUSINESS_AUDIO_GENRES = [
  'ALL',
  'ROCK',
  'POP',
  'LATIN',
  'METAL',
  'ELECTRONIC',
  'HIP_HOP/RAP',
  'ALTERNATIVE/INDIE',
  'FOLK',
  'R&B/SOUL',
  'COUNTRY',
  'CLASSICAL',
  'JAZZ',
  'REGGAE',
  'CHILDHOOD',
  'BLUES',
  'EASY_LISTENING',
  'NEW_AGE',
  'WORLD_MUSIC',
  'EXPERIMENTAL',
  'DEVOTIONAL',
  'CHINESE_TRADITION',
  '8_BIT',
  'A_CAPPELLA',
  'AFRO-POP',
  'ALTERNATIVE_HIP_HOP',
  'ALTERNATIVE_ROCK',
  'AMBIENT',
  'ARABIC_POP',
  'BASS_HOUSE',
  'BGM',
  'BOOMBAP',
  'BOSSA_NOVA',
  'BRAZILIAN_FUNK_STYLE',
  'BUDDHIST_MUSIC',
  'CANTOPOP',
  'CELTIC_POP',
  'CHAMBER_MUSIC',
  'CHILL_BEATS',
  'CHILLOUT',
  'CHINESE_FOLK',
  'CHINESE_OPERA',
  'CHINESE_POP',
  'CHINESE_STYLE',
  'CHINOISERIE_ELECTRONIC',
  'CHINOISERIE_RAP',
  'CHRISTIAN_MUSIC',
  'CONTEMPORARY_R&B',
  'COUNTRY_POP',
  'DANCE_POP',
  'DISCO',
  'DJ',
  'DRUM&BASS',
  'DUBSTEP',
  'EDM',
  'EDM_TRAP',
  'ELECTRO_POP',
  'EPIC',
  'FOLK_POP',
  'FUNK',
  'FUTURE_BASS',
  'GOSPEL',
  'GUFENG_MUSIC',
  'HARD_ROCK',
  'HIP_HOUSE',
  'HOLIDAY_MUSIC',
  'HOUSE',
  'INDIAN_POP',
  'INDIE_FOLK',
  'INDIE_POP',
  'INDIE_ROCK',
  'INSTRUMENTAL_HIP_HOP',
  'INSTRUMENTAL_ROCK',
  'IRISH_FOLK',
  'J_ROCK',
  'JAPANESE_TRADITIONAL_MUSIC',
  'JAZZ_FUSION',
  'JAZZ_HIP_HOP',
  'JAZZ_POP',
  'J-POP',
  'K-POP',
  'LATIN_POP',
  'LO-FI',
  'MC',
  'NOISE',
  'OLD_SCHOOL',
  'OTHERS',
  'POP_RAP',
  'POP_ROCK',
  'POP_SOUL',
  'PSYCHEDELIC_ROCK',
  'PUNK',
  'R&B_RAP',
  'REGGAETON',
  'RUSSIAN_POP',
  'SERTANEJO',
  'SON_CUBANO',
  'SOUL',
  'SOUNDTRACK',
  'SYMPHONY',
  'SYNTH_POP',
  'TANGO',
  'TECHNO',
  'TEEN_POP',
  'TRADITIONAL_CHINESE_FOLK',
  'TRANCE',
  'TRAP_RAP',
  'TRIP_HOP',
  'TROPICAL_HOUSE',
  'TURKISH_POP',
] as const;

export const PLATFORM_AUDIO_VALIDATION_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
};

export class InstagramAudioQueryDto {
  @ApiPropertyOptional({ enum: ['music', 'original_sound'], default: 'music' })
  @IsIn(['music', 'original_sound'])
  audio_type: 'music' | 'original_sound' = 'music';

  @ApiPropertyOptional({ description: 'Omit to retrieve trending audio.' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  search_query?: string;
}

export class TikTokBusinessAudioQueryDto {
  @ApiPropertyOptional({ default: 'US', description: 'TikTok location code.' })
  @IsISO31661Alpha2()
  @Matches(/^[A-Z]{2}$/)
  country_code: string = 'US';

  @ApiPropertyOptional({
    enum: ['1DAY', '7DAY', '30DAY', '90DAY'],
    default: '7DAY',
  })
  @IsIn(['1DAY', '7DAY', '30DAY', '90DAY'])
  date_range: '1DAY' | '7DAY' | '30DAY' | '90DAY' = '7DAY';

  @ApiPropertyOptional({ enum: TIKTOK_BUSINESS_AUDIO_GENRES, default: 'ALL' })
  @IsIn(TIKTOK_BUSINESS_AUDIO_GENRES)
  genre: (typeof TIKTOK_BUSINESS_AUDIO_GENRES)[number] = 'ALL';
}

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
  @ApiPropertyOptional({
    type: PlatformAudioConfigurationsDto,
    description:
      'Nested bracket query filters. Only the account provider configuration may be supplied.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PlatformAudioConfigurationsDto)
  platform_configurations?: PlatformAudioConfigurationsDto;
}
