import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { InstagramPlatformAudioDto } from '../../instagram/dto/instagram-audio.dto';
import { TikTokBusinessPlatformAudioDto } from '../../tiktok-business/dto/tiktok-business-audio.dto';
import type { SocialAccount } from './global.dto';
import type { PlatformAudioQueryDto } from './platform-audio-query.dto';

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
