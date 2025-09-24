import { ApiProperty } from '@nestjs/swagger';

export class DeleteEntityResponseDto {
  @ApiProperty({ description: 'Whether or not the entity was deleted' })
  success: boolean;
}

export type Provider =
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'linkedin'
  | 'bluesky'
  | 'threads'
  | 'tiktok_business'
  | 'instagram_w_facebook'
  | null
  | undefined;
