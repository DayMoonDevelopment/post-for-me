import { ApiProperty } from '@nestjs/swagger';
import { SocialPostMediaDto } from './post-media.dto';
import {
  AccountConfigurationDto,
  PlatformConfigurationsDto,
} from './post-configurations.dto';
import { SocialAccountDto } from '../../social-provider-connections/dto/social-accounts.dto';

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
}

export class SocialPostDto {
  @ApiProperty({ description: 'Unique identifier of the post' })
  id: string;

  @ApiProperty({
    description: 'Provided unique identifier of the post',
    nullable: true,
    type: String,
  })
  external_id?: string | undefined | null;

  @ApiProperty({ description: 'Caption text for the post' })
  caption: string;

  @ApiProperty({
    description:
      'Current status of the post: draft, processed, scheduled, or processing',
    enum: PostStatus,
  })
  status: PostStatus;

  @ApiProperty({
    description: 'Scheduled date and time for the post',
    nullable: true,
    type: String,
  })
  scheduled_at?: string | undefined | null;

  @ApiProperty({
    description: 'Platform-specific configurations for the post',
    nullable: true,
    type: PlatformConfigurationsDto,
  })
  platform_configurations: PlatformConfigurationsDto | undefined | null;

  @ApiProperty({
    description: 'Account-specific configurations for the post',
    nullable: true,
    isArray: true,
    type: AccountConfigurationDto,
  })
  account_configurations: AccountConfigurationDto[] | undefined | null;

  @ApiProperty({
    description: 'Array of media URLs associated with the post',
    nullable: true,
    isArray: true,
    type: SocialPostMediaDto,
  })
  media: SocialPostMediaDto[] | null;

  @ApiProperty({
    description: 'Array of social account IDs for posting',
    isArray: true,
    type: SocialAccountDto,
  })
  social_accounts: SocialAccountDto[];

  @ApiProperty({ description: 'Timestamp when the post was created' })
  created_at: string;

  @ApiProperty({ description: 'Timestamp when the post was last updated' })
  updated_at: string;
}
