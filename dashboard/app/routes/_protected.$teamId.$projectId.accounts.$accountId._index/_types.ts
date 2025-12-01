export interface MediaItem {
  url?: string;
  type?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PlatformPost {
  platform: string;
  social_post_result_id?: string;
  posted_at?: string;
  social_post_id?: string;
  external_post_id?: string;
  platform_post_id: string;
  social_account_id: string;
  external_account_id?: string;
  platform_account_id: string;
  platform_url: string;
  caption: string;
  media: MediaItem[];
  metrics: PostMetrics;
}

export interface PostMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  favorites?: number;
  reach?: number;
  video_views?: number;
  total_time_watched?: number;
  average_time_watched?: number;
  full_video_watched_rate?: number;
  new_followers?: number;
  profile_views?: number;
  website_clicks?: number;
  phone_number_clicks?: number;
  lead_submissions?: number;
  app_download_clicks?: number;
  email_clicks?: number;
  address_clicks?: number;
  impressions?: number;
  saved?: number;
  engagement?: number;
  plays?: number;
  total_interactions?: number;
  [key: string]: number | string | boolean | null | undefined;
}

export interface LoaderData {
  success: boolean;
  posts: PlatformPost[];
  meta: {
    cursor?: string;
    limit: number;
    next?: string | null;
    has_more: boolean;
  };
  accountInfo?: {
    id: string;
    provider: string;
    username?: string;
    external_id?: string;
  };
  error?: string;
}
