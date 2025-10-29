import { ApiProperty } from '@nestjs/swagger';
import { SocialAccountMetadata } from './create-social-account.dto';

export class SocialAccountDto {
  @ApiProperty({ description: 'The unique identifier of the social account' })
  id: string;

  @ApiProperty({ description: 'The platform of the social account' })
  platform: string;

  @ApiProperty({
    description: "The platform's username of the social account",
    type: String,
    nullable: true,
  })
  username: string | null | undefined;

  @ApiProperty({
    description: "The platform's id of the social account",
    type: String,
  })
  user_id: string;

  @ApiProperty({
    description: "The platform's profile photo of the social account",
    type: String,
    nullable: true,
  })
  profile_photo_url?: string | null | undefined;

  @ApiProperty({
    description: 'The access token of the social account',
    type: String,
  })
  access_token: string;

  @ApiProperty({
    description: 'The refresh token of the social account',
    type: String,
    nullable: true,
  })
  refresh_token: string | null | undefined;

  @ApiProperty({
    description: 'The access token expiration date of the social account',
    type: Date,
  })
  access_token_expires_at: string;

  @ApiProperty({
    description: 'The refresh token expiration date of the social account',
    type: Date,
    nullable: true,
  })
  refresh_token_expires_at: string | null | undefined;

  @ApiProperty({
    description: 'Status of the account',
    enum: ['connected', 'disconnected'],
  })
  status?: 'connected' | 'disconnected';

  @ApiProperty({
    description: 'The external id of the social account',
    type: String,
    nullable: true,
  })
  external_id?: string | null | undefined;

  @ApiProperty({
    description: 'The metadata of the social account',
    type: SocialAccountMetadata,
    nullable: true,
  })
  metadata?: SocialAccountMetadata | null | undefined;
}

export class DisconnectedSocialAccountDto extends SocialAccountDto {
  @ApiProperty({
    description: 'Status of the account',
    enum: ['disconnected'],
  })
  declare status: 'disconnected';
}
