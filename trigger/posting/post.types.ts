export interface PostResult {
  provider_connection_id: string;
  success: boolean;
  error_message?: string;
  post_id: string;
  provider_post_url?: string;
  provider_post_id?: string;
  details?: any;
}

export interface UserTag {
  id: string;
  type: string;
  platform: string;
  x?: number;
  y?: number;
}

export interface TwitterPoll {
  duration_minutes: number;
  options: string[];
  reply_settings?: string;
}

export type Provider =
  | "facebook"
  | "instagram"
  | "x"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "linkedin"
  | "bluesky"
  | "threads";

export interface Post {
  caption: string;
  api_key: string;
  id: string;
  post_at: string;
  project_id: string;
  social_post_provider_connections: {
    social_provider_connections: {
      provider: Provider;
      id: string;
      social_provider_user_name: string | null | undefined;
      access_token: string;
      refresh_token: string | null;
      access_token_expires_at: Date | null;
      refresh_token_expires_at: Date | null;
      social_provider_user_id: string;
      social_provider_metadata: any;
    };
  }[];
  social_post_media: {
    url: string;
    thumbnail_url: string | null;
    thumbnail_timestamp_ms: number | null;
    provider: Provider | null;
    provider_connection_id: string | null;
  }[];
  social_post_configurations: {
    caption: string | null;
    provider: Provider | null;
    provider_connection_id: string | null;
    provider_data: PlatformConfiguration;
  }[];
}

export interface PostValidation {
  isValid: boolean;
  errors: string[];
}

export interface SocialAccount {
  provider: Provider;
  id: string;
  social_provider_user_name: string | null | undefined;
  access_token: string;
  refresh_token: string | null;
  access_token_expires_at: Date | null;
  refresh_token_expires_at: Date | null;
  social_provider_user_id: string;
  social_provider_metadata: any;
}

export interface RefreshTokenResult {
  access_token: string | undefined;
  expires_at: string;
  refresh_token?: string | null;
}

export interface PostMedia {
  url: string;
  thumbnail_url?: string | null;
  thumbnail_timestamp_ms?: number | null;
  type: string;
  tags?: UserTag[] | null;
}

export interface AccountConfiguration {
  account_id: number;
  caption?: string;
  media?: PostMedia[];
}

export interface AccountConfigurationParent {
  account_configurations?: AccountConfiguration[];
}

export interface PinterestConfiguration {
  caption?: string;
  board_ids?: string[];
  link?: string;
  media?: PostMedia[];
}

export interface InstagramConfiguration {
  caption?: string;
  placement?: string;
  media?: PostMedia[];
  collaborators?: string[];
  share_to_feed?: boolean;
  location?: string;
  trial_reel_type?: string;
}

export interface TiktokConfiguration {
  caption?: string;
  title?: string;
  media?: PostMedia[];
  privacy_status?: string;
  allow_comment?: boolean;
  allow_duet?: boolean;
  allow_stitch?: boolean;
  disclose_your_brand?: boolean;
  disclose_branded_content?: boolean;
  is_ai_generated?: boolean;
  is_draft?: boolean;
  auto_add_music?: boolean;
}

export interface TwitterConfiguration {
  caption?: string;
  media?: PostMedia[];
  poll?: TwitterPoll;
  community_id?: string;
  quote_tweet_id?: string;
  reply_settings?: string;
}

export interface YoutubeConfiguration {
  caption?: string;
  title?: string;
  privacy_status?: string;
  made_for_kids?: boolean;
  media?: PostMedia[];
}

export interface FacebookConfiguration {
  caption?: string;
  placement?: string;
  media?: PostMedia[];
  location?: string;
  collaborators?: string[];
}

export interface LinkedinConfiguration {
  caption?: string;
  media?: PostMedia[];
}

export interface BlueskyConfiguration {
  caption?: string;
  media?: PostMedia[];
}

export interface ThreadsConfiguration {
  caption?: string;
  location?: "reels" | "timeline";
  media?: PostMedia[];
}

export interface TempMedia {
  key: string;
  bucket: string;
}

export type PlatformConfiguration =
  | PinterestConfiguration
  | InstagramConfiguration
  | TiktokConfiguration
  | TwitterConfiguration
  | YoutubeConfiguration
  | FacebookConfiguration
  | LinkedinConfiguration
  | BlueskyConfiguration
  | ThreadsConfiguration;

export interface PlatformAppCredentials {
  app_id: string;
  app_secret: string;
}

export interface IndividualPostData {
  stripeCustomerId: string;
  platform: string;
  postId: string;
  media: PostMedia[];
  caption: string;
  account: SocialAccount;
  projectId: string;
  platformConfig: PlatformConfiguration;
  appCredentials: PlatformAppCredentials;
}
