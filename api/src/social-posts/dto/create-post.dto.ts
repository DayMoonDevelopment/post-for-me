import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SocialPostMediaDto } from './post-media.dto';
import {
  AccountConfigurationDto,
  PlatformConfigurationsDto,
} from './post-configurations.dto';

export class CreateSocialPostDto {
  @ApiProperty({ description: 'Caption text for the post' })
  caption: string;

  @ApiProperty({
    description:
      'Scheduled date and time for the post, setting to null or undefined will post instantly',
    nullable: true,
    required: false,
    type: Date,
  })
  @Type(() => Date)
  scheduled_at?: Date | undefined | null;

  @ApiProperty({
    description: 'Platform-specific configurations for the post',
    nullable: true,
    required: false,
    type: PlatformConfigurationsDto,
  })
  platform_configurations?: PlatformConfigurationsDto | null;

  @ApiProperty({
    description: 'Account-specific configurations for the post',
    nullable: true,
    required: false,
    isArray: true,
    type: AccountConfigurationDto,
  })
  account_configurations?: AccountConfigurationDto[] | null;

  @ApiProperty({
    description:
      'Array of media associated with the post. If multiple media items are provided and the placement is `stories`, individual posts are created per media item.',
    nullable: true,
    required: false,
    type: SocialPostMediaDto,
    isArray: true,
  })
  media: SocialPostMediaDto[] | null;

  @ApiProperty({ description: 'Array of social account IDs for posting' })
  social_accounts: string[];

  @ApiProperty({
    description: 'Array of social account IDs for posting',
    nullable: true,
    required: false,
    type: String,
  })
  external_id: string | null;

  @ApiProperty({
    description: 'If isDraft is set then the post will not be processed',
    nullable: true,
    default: false,
    required: false,
    type: Boolean,
  })
  isDraft: boolean | null;
}
