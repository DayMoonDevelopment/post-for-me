import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
