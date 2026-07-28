import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SocialAccountMetadata {
  bluesky_app_password?: string;

  has_platform_premium?: boolean;

  is_sandbox?: boolean;
}

export class CreateSocialAccountDto {
  @ApiProperty({
    description: 'The platform of the social account',
    enum: [
      'facebook',
      'instagram',
      'x',
      'tiktok',
      'youtube',
      'pinterest',
      'linkedin',
      'bluesky',
      'threads',
      'tiktok_business',
    ],
    required: true,
  })
  platform:
    | 'facebook'
    | 'instagram'
    | 'x'
    | 'tiktok'
    | 'youtube'
    | 'pinterest'
    | 'linkedin'
    | 'bluesky'
    | 'threads'
    | 'tiktok_business';

  @ApiProperty({
    description: 'The user id of the social account',
    required: true,
    type: String,
  })
  user_id: string;

  @ApiProperty({
    description: "The platform's username of the social account",
    type: String,
    nullable: true,
    required: false,
  })
  username: string | null | undefined;

  @ApiProperty({
    description: 'The external id of the social account',
    type: String,
    nullable: true,
    required: false,
  })
  external_id?: string | null | undefined;

  @ApiProperty({
    description: 'The access token of the social account',
    type: String,
    required: true,
  })
  access_token: string;

  @ApiProperty({
    description: 'The refresh token of the social account',
    type: String,
    nullable: true,
    required: false,
  })
  refresh_token: string | null | undefined;

  @ApiProperty({
    description:
      'The access token expiration date of the social account, in UTC (ISO 8601)',
    type: Date,
    required: true,
  })
  @Type(() => Date)
  access_token_expires_at: Date;

  @ApiProperty({
    description:
      'The refresh token expiration date of the social account, in UTC (ISO 8601)',
    type: Date,
    nullable: true,
    required: false,
  })
  @Type(() => Date)
  refresh_token_expires_at: Date | null | undefined;

  @ApiProperty({
    description: 'The metadata of the social account',
    type: SocialAccountMetadata,
    required: false,
  })
  metadata: SocialAccountMetadata | null | undefined;
}
