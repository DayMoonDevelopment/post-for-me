import { ApiProperty } from '@nestjs/swagger';
import { SocialPostMediaDto } from './post-media.dto';

export type PlatformConfiguration =
  | PinterestConfigurationDto
  | InstagramConfigurationDto
  | TiktokConfigurationDto
  | TwitterConfigurationDto
  | YoutubeConfigurationDto
  | FacebookConfigurationDto
  | LinkedinConfigurationDto
  | BlueskyConfigurationDto
  | ThreadsConfigurationDto
  | TiktokBusinessConfigurationDto;

export class BaseConfigurationDto {
  @ApiProperty({
    description: 'Overrides the `caption` from the post',
    nullable: true,
    required: false,
  })
  caption?: string | null;

  @ApiProperty({
    description: 'Overrides the `media` from the post',
    type: SocialPostMediaDto,
    nullable: true,
    required: false,
    isArray: true,
  })
  media?: SocialPostMediaDto[];
}

export class PinterestConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Pinterest board IDs',
    type: Array,
    items: { type: 'string' },
    nullable: true,
    required: false,
  })
  board_ids?: string[];

  @ApiProperty({
    description: 'Pinterest post link',
    nullable: true,
    required: false,
  })
  link?: string;
}

export class InstagramConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Instagram post placement',
    enum: ['reels', 'stories', 'timeline'],
    nullable: true,
    required: false,
  })
  placement?: string;

  @ApiProperty({
    description: 'Instagram usernames to be tagged as a collaborator',
    type: Array,
    items: { type: 'string' },
    nullable: true,
    required: false,
  })
  collaborators?: string[];
}

export class TiktokConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Overrides the `title` from the post',
    nullable: true,
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Sets the privacy status for TikTok (private, public)',
    nullable: true,
    required: false,
    default: 'public',
  })
  privacy_status?: string;

  @ApiProperty({
    description: 'Allow comments on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_comment?: boolean;

  @ApiProperty({
    description: 'Allow duets on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_duet?: boolean;

  @ApiProperty({
    description: 'Allow stitch on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_stitch?: boolean;

  @ApiProperty({
    description: 'Disclose your brand on TikTok',
    nullable: true,
    required: false,
    default: false,
  })
  disclose_your_brand?: boolean;

  @ApiProperty({
    description: 'Disclose branded content on TikTok',
    nullable: true,
    required: false,
    default: false,
  })
  disclose_branded_content?: boolean;

  @ApiProperty({
    description: 'Flag content as AI generated on TikTok',
    nullable: true,
    required: false,
    default: false,
  })
  is_ai_generated?: boolean;

  @ApiProperty({
    description:
      'Will create a draft upload to TikTok, posting will need to be completed from within the app',
    nullable: true,
    required: false,
    default: false,
  })
  is_draft?: boolean;

  @ApiProperty({
    description: 'Will automatically add music to photo posts',
    nullable: true,
    required: false,
    default: true,
  })
  auto_add_music?: boolean;
}

export class TiktokBusinessConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Overrides the `title` from the post',
    nullable: true,
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Sets the privacy status for TikTok (private, public)',
    nullable: true,
    required: false,
    default: 'public',
  })
  privacy_status?: string;

  @ApiProperty({
    description: 'Allow comments on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_comment?: boolean;

  @ApiProperty({
    description: 'Allow duets on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_duet?: boolean;

  @ApiProperty({
    description: 'Allow stitch on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_stitch?: boolean;

  @ApiProperty({
    description: 'Disclose your brand on TikTok',
    nullable: true,
    required: false,
    default: false,
  })
  disclose_your_brand?: boolean;

  @ApiProperty({
    description: 'Disclose branded content on TikTok',
    nullable: true,
    required: false,
    default: false,
  })
  disclose_branded_content?: boolean;
}

export class TwitterConfigurationDto extends BaseConfigurationDto {}

export class YoutubeConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Overrides the `title` from the post',
    nullable: true,
    required: false,
  })
  title?: string;
}

export class FacebookConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Facebook post placement',
    enum: ['reels', 'stories', 'timeline'],
    nullable: true,
    required: false,
  })
  placement?: string;
}

export class LinkedinConfigurationDto extends BaseConfigurationDto {}

export class BlueskyConfigurationDto extends BaseConfigurationDto {}

export class ThreadsConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Threads post placement',
    enum: ['reels', 'timeline'],
    nullable: true,
    required: false,
  })
  placement?: string;
}

// DTO's
export class PlatformConfigurationsDto {
  @ApiProperty({
    description: 'Pinterest configuration',
    type: PinterestConfigurationDto,
    required: false,
    nullable: true,
  })
  pinterest?: PinterestConfigurationDto;

  @ApiProperty({
    description: 'Instagram configuration',
    type: InstagramConfigurationDto,
    required: false,
    nullable: true,
  })
  instagram?: InstagramConfigurationDto;

  @ApiProperty({
    description: 'TikTok configuration',
    type: TiktokConfigurationDto,
    required: false,
    nullable: true,
  })
  tiktok?: TiktokConfigurationDto;

  @ApiProperty({
    description: 'Twitter configuration',
    type: TwitterConfigurationDto,
    required: false,
    nullable: true,
  })
  x?: TwitterConfigurationDto;

  @ApiProperty({
    description: 'YouTube configuration',
    type: YoutubeConfigurationDto,
    required: false,
    nullable: true,
  })
  youtube?: YoutubeConfigurationDto;

  @ApiProperty({
    description: 'Facebook configuration',
    type: FacebookConfigurationDto,
    required: false,
    nullable: true,
  })
  facebook?: FacebookConfigurationDto;

  @ApiProperty({
    description: 'LinkedIn configuration',
    type: LinkedinConfigurationDto,
    required: false,
    nullable: true,
  })
  linkedin?: LinkedinConfigurationDto;

  @ApiProperty({
    description: 'Bluesky configuration',
    type: BlueskyConfigurationDto,
    required: false,
    nullable: true,
  })
  bluesky?: BlueskyConfigurationDto;

  @ApiProperty({
    description: 'Threads configuration',
    type: ThreadsConfigurationDto,
    required: false,
    nullable: true,
  })
  threads?: ThreadsConfigurationDto;

  @ApiProperty({
    description: 'TikTok configuration',
    type: TiktokConfigurationDto,
    required: false,
    nullable: true,
  })
  tiktok_business?: TiktokBusinessConfigurationDto;
}
//

export class AccountConfigurationDetailsDto {
  @ApiProperty({
    description: 'Overrides the `caption` from the post',
    nullable: true,
    required: false,
  })
  caption?: string | null;

  @ApiProperty({
    description: 'Overrides the `media` from the post',
    type: [String],
    nullable: true,
    required: false,
  })
  media?: SocialPostMediaDto[];

  @ApiProperty({
    description: 'Pinterest board IDs',
    type: Array,
    items: { type: 'string' },
    nullable: true,
    required: false,
  })
  board_ids?: string[];

  @ApiProperty({
    description: 'Pinterest post link',
    nullable: true,
    required: false,
  })
  link?: string;

  @ApiProperty({
    description: 'Post placement for Facebook/Instagram/Threads',
    enum: ['reels', 'timeline', 'stories'],
    nullable: true,
    required: false,
  })
  placement?: 'reels' | 'timeline' | 'stories';

  @ApiProperty({
    description: 'Overrides the `title` from the post',
    nullable: true,
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Sets the privacy status for TikTok (private, public)',
    nullable: true,
    required: false,
    default: 'public',
  })
  privacy_status?: string;

  @ApiProperty({
    description: 'Allow comments on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_comment?: boolean;

  @ApiProperty({
    description: 'Allow duets on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_duet?: boolean;

  @ApiProperty({
    description: 'Allow stitch on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  allow_stitch?: boolean;

  @ApiProperty({
    description: 'Disclose your brand on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  disclose_your_brand?: boolean;

  @ApiProperty({
    description: 'Disclose branded content on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  disclose_branded_content?: boolean;

  @ApiProperty({
    description:
      'Will create a draft upload to TikTok, posting will need to be completed from within the app',
    nullable: true,
    required: false,
    default: false,
  })
  is_draft?: boolean;

  @ApiProperty({
    description: 'Flag content as AI generated on TikTok',
    nullable: true,
    required: false,
    default: false,
  })
  is_ai_generated?: boolean;

  @ApiProperty({
    description: 'Will automatically add music to photo posts on TikTok',
    nullable: true,
    required: false,
    default: true,
  })
  auto_add_music?: boolean;
}

export class AccountConfigurationDto {
  @ApiProperty({
    description:
      'ID of the social account, you want to apply the configuration to',
    type: String,
    required: true,
  })
  social_account_id: string;

  @ApiProperty({
    description: 'Configuration for the social account',
    required: true,
    type: AccountConfigurationDetailsDto,
  })
  configuration: PlatformConfiguration;
}
