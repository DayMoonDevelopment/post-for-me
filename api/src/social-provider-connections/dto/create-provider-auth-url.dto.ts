import { ApiProperty } from '@nestjs/swagger';

export class BluesyAuthUrlProviderData {
  @ApiProperty({ description: 'The handle of the account', type: String })
  handle: string;

  @ApiProperty({ description: 'The app password of the account', type: String })
  app_password: string;
}

export class LinkedInUrlProviderData {
  @ApiProperty({
    enum: ['personal', 'organization'],
    description:
      'The type of connection; personal for posting on behalf of the user only, organization for posting on behalf of both an organization and the user',
    default: 'personal',
  })
  connection_type: 'personal' | 'organization';
}

export class InstagramProviderData {
  @ApiProperty({
    enum: ['instagram', 'facebook'],
    description:
      'The type of connection; instagram for using login with instagram, facebook for using login with facebook.',
    default: 'instagram',
  })
  connection_type: 'instagram' | 'facebook';
}

export class AuthUrlProviderData {
  @ApiProperty({
    description: 'Additional data needed for connecting bluesky accounts',
    required: false,
    type: BluesyAuthUrlProviderData,
  })
  bluesky?: BluesyAuthUrlProviderData;

  @ApiProperty({
    description: 'Additional data for connecting linkedin accounts',
    required: false,
    type: LinkedInUrlProviderData,
  })
  linkedin?: LinkedInUrlProviderData;

  @ApiProperty({
    description: 'Additional data for connecting instagram accounts',
    required: false,
    type: InstagramProviderData,
  })
  instagram?: InstagramProviderData;
}

export class CreateSocialAccountProviderAuthUrlDto {
  @ApiProperty({ description: 'The social account provider', type: String })
  platform: string;

  @ApiProperty({
    description: 'Additional data needed for the provider',
    required: false,
    type: AuthUrlProviderData,
  })
  platform_data?: AuthUrlProviderData | null;

  @ApiProperty({
    description: 'Your unique identifier for the social account',
    required: false,
  })
  external_id?: string;
}
