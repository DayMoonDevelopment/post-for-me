/**
 * TikTok API Response Types
 * Based on TikTok's Open API documentation
 */

/**
 * TikTok video item from the API
 */
export interface TikTokVideo {
  id: string;
  title?: string;
  share_url?: string;
  embed_link?: string;
  cover_image_url?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  video_description?: string;
  create_time?: number;
  duration?: number;
  height?: number;
  width?: number;
}

/**
 * TikTok video list response data
 */
export interface TikTokVideoListData {
  videos: TikTokVideo[];
  cursor: number;
  has_more: boolean;
}

/**
 * TikTok video list API response
 */
export interface TikTokVideoListResponse {
  data: TikTokVideoListData;
  error?: {
    code: string;
    message: string;
    log_id?: string;
  };
}

/**
 * TikTok OAuth token response
 */
export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  open_id?: string;
  error?: string;
  error_description?: string;
}
