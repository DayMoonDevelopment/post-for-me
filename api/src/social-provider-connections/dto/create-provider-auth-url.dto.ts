import { ApiProperty } from '@nestjs/swagger';

export class BluesyAuthUrlProviderData {
  @ApiProperty({ description: 'The handle of the account', type: String })
  handle: string;

  @ApiProperty({ description: 'The app password of the account', type: String })
  app_password: string;

  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Bluesky uses app passwords and does not have traditional OAuth scopes.',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class LinkedInUrlProviderData {
  @ApiProperty({
    enum: ['personal', 'organization'],
    description:
      'The type of connection; If using our provided credentials always use "organization". If using your own crednetials then only use "organization" if you are using the Community API',
    default: 'personal',
  })
  connection_type: 'personal' | 'organization';

  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default personal scopes: openid, w_member_social, profile, email. Default organization scopes: r_basicprofile, w_member_social, r_organization_social, w_organization_social, rw_organization_admin',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class InstagramProviderData {
  @ApiProperty({
    enum: ['instagram', 'facebook'],
    description:
      'The type of connection; instagram for using login with instagram, facebook for using login with facebook.',
    default: 'instagram',
  })
  connection_type: 'instagram' | 'facebook';

  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default instagram scopes: instagram_business_basic, instagram_business_content_publish. Default facebook scopes: instagram_basic, instagram_content_publish, pages_show_list, public_profile, business_management',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class FacebookProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: public_profile, pages_show_list, pages_read_engagement, pages_manage_posts, business_management',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class XProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. X (Twitter) uses OAuth 1.0a and does not support granular scopes - permissions are controlled by the app configuration.',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class TikTokProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: user.info.basic, video.list, video.upload, video.publish',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class TikTokBusinessProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: user.info.basic, user.info.username, user.info.stats, user.info.profile, user.account.type, user.insights, video.list, video.insights, comment.list, comment.list.manage, video.publish, video.upload, biz.spark.auth, discovery.search.words',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class YouTubeProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: https://www.googleapis.com/auth/youtube.force-ssl, https://www.googleapis.com/auth/youtube.upload, https://www.googleapis.com/auth/youtube.readonly, https://www.googleapis.com/auth/userinfo.profile',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class PinterestProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: boards:read, boards:write, pins:read, pins:write, user_accounts:read',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
}

export class ThreadsProviderData {
  @ApiProperty({
    description:
      'Override the default permissions/scopes requested during OAuth. Default scopes: threads_basic, threads_content_publish',
    required: false,
    type: [String],
    isArray: true,
  })
  permission_overrides?: string[];
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

  @ApiProperty({
    description: 'Additional data for connecting facebook accounts',
    required: false,
    type: FacebookProviderData,
  })
  facebook?: FacebookProviderData;

  @ApiProperty({
    description: 'Additional data for connecting X (Twitter) accounts',
    required: false,
    type: XProviderData,
  })
  x?: XProviderData;

  @ApiProperty({
    description: 'Additional data for connecting TikTok accounts',
    required: false,
    type: TikTokProviderData,
  })
  tiktok?: TikTokProviderData;

  @ApiProperty({
    description: 'Additional data for connecting TikTok Business accounts',
    required: false,
    type: TikTokBusinessProviderData,
  })
  tiktok_business?: TikTokBusinessProviderData;

  @ApiProperty({
    description: 'Additional data for connecting YouTube accounts',
    required: false,
    type: YouTubeProviderData,
  })
  youtube?: YouTubeProviderData;

  @ApiProperty({
    description: 'Additional data for connecting Pinterest accounts',
    required: false,
    type: PinterestProviderData,
  })
  pinterest?: PinterestProviderData;

  @ApiProperty({
    description: 'Additional data for connecting Threads accounts',
    required: false,
    type: ThreadsProviderData,
  })
  threads?: ThreadsProviderData;
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

  @ApiProperty({
    description: `Override the default redirect URL for the OAuth flow. If provided, this URL will be used instead of our redirect URL. Make sure this URL is included in your app's authorized redirect urls. This override will not work when using our system credientals.`,
    required: false,
  })
  redirect_url_override?: string;

  @ApiProperty({
    description:
      'List of permissions you want to allow. Use this to connect users to apps that are not approved for all permissions. Will default to post permissions.',
    required: false,
    default: ['posts'],
  })
  permissions?: string[];
}
