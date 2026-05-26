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

export class TwitterPollDto {
  @ApiProperty({
    description: 'Duration of the poll in minutes',
    required: true,
  })
  duration_minutes: number;

  @ApiProperty({
    description: 'The choices of the poll, requiring 2-4 options',
    required: true,
  })
  options: string[];

  @ApiProperty({
    description: 'Who can reply to the tweet',
    enum: ['following', 'mentionedUsers', 'subscribers', 'verified'],
    required: false,
  })
  reply_settings: string;
}

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
    description: 'Overrides the `title` from the post for Pinterest',
    nullable: true,
    required: false,
  })
  title?: string;

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

  @ApiProperty({
    description: 'If false video posts will only be shown in the Reels tab',
    nullable: true,
    required: false,
    default: true,
  })
  share_to_feed?: boolean;

  @ApiProperty({
    description:
      'Page id with a location that you want to tag the image or video with',
    nullable: true,
    required: false,
  })
  location?: string;

  @ApiProperty({
    description:
      'Instagram trial reel type, when passed will be created as a trial reel. If manual the trial reel can be manually graduated in the native app. If perfomance the trial reel will be automatically graduated if the trial reel performs well.',
    enum: ['manual', 'performance'],
    nullable: true,
    required: false,
  })
  trial_reel_type?: string;

  @ApiProperty({
    description:
      'Display name for the audio track on Instagram Reels. Only honored on Reels uploads, and only when the audio is original (Meta silently ignores it on licensed/fingerprinted tracks).',
    nullable: true,
    required: false,
  })
  audio_name?: string;
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

export class TwitterConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Poll options for the tweet',
    required: false,
    nullable: false,
    type: TwitterPollDto,
  })
  poll?: TwitterPollDto;

  @ApiProperty({
    description: 'Id of the community to post to',
    required: false,
    nullable: false,
  })
  community_id?: string;

  @ApiProperty({
    description: 'Id of the tweet you want to quote',
    required: false,
    nullable: false,
  })
  quote_tweet_id?: string;

  @ApiProperty({
    description: 'Who can reply to the tweet',
    enum: ['following', 'mentionedUsers', 'subscribers', 'verified'],
    required: false,
    nullable: true,
  })
  reply_settings?: string;
}

export class YoutubeLocalizationDto {
  @ApiProperty({
    description: 'Localized title for the video',
    required: false,
    nullable: true,
  })
  title?: string;

  @ApiProperty({
    description: 'Localized description for the video',
    required: false,
    nullable: true,
  })
  description?: string;
}

export class YoutubeConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Overrides the `title` from the post (maps to snippet.title)',
    nullable: true,
    required: false,
  })
  title?: string;

  @ApiProperty({
    description:
      'Description for the YouTube video (maps to snippet.description). Falls back to the post caption when not provided.',
    nullable: true,
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'YouTube video tags (maps to snippet.tags)',
    type: Array,
    items: { type: 'string' },
    nullable: true,
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    description:
      'YouTube video category id (maps to snippet.categoryId; see YouTube Data API videoCategories.list)',
    nullable: true,
    required: false,
  })
  category_id?: string;

  @ApiProperty({
    description:
      'Default language of the video (BCP-47 language tag, e.g. "en"). Maps to snippet.defaultLanguage.',
    nullable: true,
    required: false,
  })
  default_language?: string;

  @ApiProperty({
    description:
      'Per-language localizations for the video title and description. Keys are BCP-47 language tags (e.g. "fr", "es"). Maps to localizations on the YouTube Data API videos resource.',
    type: 'object',
    additionalProperties: {
      $ref: '#/components/schemas/YoutubeLocalizationDto',
    },
    nullable: true,
  })
  localizations?: Record<string, YoutubeLocalizationDto>;

  @ApiProperty({
    description:
      'Sets the privacy status of the video (maps to status.privacyStatus), will default to public',
    nullable: true,
    required: false,
    enum: ['public', 'private', 'unlisted'],
    default: 'public',
  })
  privacy_status?: string;

  @ApiProperty({
    description:
      'If true the video can be embedded on other websites (maps to status.embeddable). Defaults to true.',
    nullable: true,
    required: false,
    default: true,
  })
  embeddable?: boolean;

  @ApiProperty({
    description:
      'The video\'s license (maps to status.license). "youtube" is the standard YouTube license; "creativeCommon" is Creative Commons.',
    nullable: true,
    required: false,
    enum: ['youtube', 'creativeCommon'],
    default: 'youtube',
  })
  license?: string;

  @ApiProperty({
    description:
      'If true, the extended video statistics are publicly viewable (maps to status.publicStatsViewable). Defaults to true.',
    nullable: true,
    required: false,
    default: true,
  })
  public_stats_viewable?: boolean;

  @ApiProperty({
    description:
      'ISO 8601 datetime at which the video should be published. Only honoured when privacy_status is "private" (maps to status.publishAt).',
    nullable: true,
    required: false,
  })
  publish_at?: string;

  @ApiProperty({
    description:
      'If true will notify YouTube the video is intended for kids (maps to status.selfDeclaredMadeForKids), defaults to false',
    nullable: true,
    required: false,
    default: false,
  })
  made_for_kids?: boolean;

  @ApiProperty({
    description:
      'If true, marks the video as containing altered or synthetic content per YouTube\'s disclosure policy (maps to status.containsSyntheticMedia). YouTube adds a "How this content was made" label to the description automatically.',
    nullable: true,
    required: false,
  })
  contains_synthetic_media?: boolean;

  @ApiProperty({
    description:
      'ISO 8601 date (YYYY-MM-DD) or datetime when the video was recorded (maps to recordingDetails.recordingDate).',
    nullable: true,
    required: false,
  })
  recording_date?: string;
}

export class FacebookConfigurationDto extends BaseConfigurationDto {
  @ApiProperty({
    description: 'Facebook post placement',
    enum: ['reels', 'stories', 'timeline'],
    nullable: true,
    required: false,
  })
  placement?: string;

  @ApiProperty({
    description:
      'Page id with a location that you want to tag the image or video with',
    nullable: true,
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'List of page ids to invite as collaborators for a Video Reel',
    nullable: true,
    required: false,
    isArray: true,
  })
  collaborators?: string[];

  @ApiProperty({
    description:
      'If true, include the caption on each image in a carousel upload; if false, only include it on the final carousel post',
    nullable: true,
    required: false,
    default: true,
  })
  set_caption_for_each_image?: boolean;
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
    type: SocialPostMediaDto,
    nullable: true,
    required: false,
    isArray: true,
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
    description:
      'Overrides the `title` from the post (Pinterest, TikTok, YouTube)',
    nullable: true,
    required: false,
  })
  title?: string;

  @ApiProperty({
    description:
      'Sets the privacy status for TikTok (private, public), or YouTube (private, public, unlisted)',
    nullable: true,
    required: false,
    enum: ['public', 'private', 'unlisted'],
    default: 'public',
  })
  privacy_status?: string;

  @ApiProperty({
    description:
      'If true will notify YouTube the video is intended for kids, defaults to false',
    nullable: true,
    required: false,
    default: false,
  })
  made_for_kids?: boolean;

  @ApiProperty({
    description:
      'If true, marks the YouTube video as containing altered or synthetic content per YouTube\'s disclosure policy. Sets status.containsSyntheticMedia on the videos.insert call; YouTube adds a "How this content was made" label to the description automatically.',
    nullable: true,
    required: false,
  })
  contains_synthetic_media?: boolean;

  @ApiProperty({
    description: 'YouTube video tags',
    type: Array,
    items: { type: 'string' },
    nullable: true,
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    description:
      'YouTube video category id (maps to snippet.categoryId; see YouTube Data API videoCategories.list)',
    nullable: true,
    required: false,
  })
  category_id?: string;

  @ApiProperty({
    description:
      'Default language of the video (BCP-47 language tag, e.g. "en"). Maps to snippet.defaultLanguage.',
    nullable: true,
    required: false,
  })
  default_language?: string;

  @ApiProperty({
    description:
      'Per-language localizations for the video title and description. Keys are BCP-47 language tags (e.g. "fr", "es"). Maps to localizations on the YouTube Data API videos resource.',
    type: 'object',
    additionalProperties: {
      $ref: '#/components/schemas/YoutubeLocalizationDto',
    },
    nullable: true,
  })
  localizations?: Record<string, YoutubeLocalizationDto>;

  @ApiProperty({
    description:
      'If true the video can be embedded on other websites (maps to status.embeddable). Defaults to true.',
    nullable: true,
    required: false,
    default: true,
  })
  embeddable?: boolean;

  @ApiProperty({
    description:
      'The video\'s license (maps to status.license). "youtube" is the standard YouTube license; "creativeCommon" is Creative Commons.',
    nullable: true,
    required: false,
    enum: ['youtube', 'creativeCommon'],
    default: 'youtube',
  })
  license?: string;

  @ApiProperty({
    description:
      'If true, the extended video statistics are publicly viewable (maps to status.publicStatsViewable). Defaults to true.',
    nullable: true,
    required: false,
    default: true,
  })
  public_stats_viewable?: boolean;

  @ApiProperty({
    description:
      'ISO 8601 datetime at which the video should be published. Only honoured when privacy_status is "private" (maps to status.publishAt).',
    nullable: true,
    required: false,
  })
  publish_at?: string;

  @ApiProperty({
    description:
      'ISO 8601 date (YYYY-MM-DD) or datetime when the video was recorded (maps to recordingDetails.recordingDate).',
    nullable: true,
    required: false,
  })
  recording_date?: string;

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

  @ApiProperty({
    description: 'Poll options for the twitter',
    required: false,
    nullable: false,
    type: TwitterPollDto,
  })
  poll?: TwitterPollDto;

  @ApiProperty({
    description: 'Id of the twitter community to post to',
    required: false,
    nullable: false,
  })
  community_id?: string;

  @ApiProperty({
    description: 'Id of the tweet you want to quote',
    required: false,
    nullable: false,
  })
  quote_tweet_id?: string;

  @ApiProperty({
    description: 'Who can reply to the tweet',
    enum: ['following', 'mentionedUsers', 'subscribers', 'verified'],
    required: false,
    nullable: true,
  })
  reply_settings?: string;

  @ApiProperty({
    description:
      'Page id with a location that you want to tag the image or video with (Instagram and Facebook)',
    nullable: true,
    required: false,
  })
  location?: string;

  @ApiProperty({
    description:
      'List of page ids or users to invite as collaborators for a Video Reel (Instagram and Facebook)',
    nullable: true,
    required: false,
    isArray: true,
  })
  collaborators?: string[];

  @ApiProperty({
    description:
      'If false Instagram video posts will only be shown in the Reels tab',
    nullable: true,
    required: false,
    default: true,
  })
  share_to_feed?: boolean;

  @ApiProperty({
    description:
      'Instagram trial reel type, when passed will be created as a trial reel. If manual the trial reel can be manually graduated in the native app. If perfomance the trial reel will be automatically graduated if the trial reel performs well.',
    enum: ['manual', 'performance'],
    nullable: true,
    required: false,
  })
  trial_reel_type?: string;

  @ApiProperty({
    description:
      'Display name for the audio track on Instagram Reels. Only honored on Reels uploads, and only when the audio is original (Meta silently ignores it on licensed/fingerprinted tracks).',
    nullable: true,
    required: false,
  })
  audio_name?: string;

  @ApiProperty({
    description:
      'If true, include the caption on each image in a Facebook carousel upload; if false, only include it on the final carousel post',
    nullable: true,
    required: false,
    default: true,
  })
  set_caption_for_each_image?: boolean;
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
