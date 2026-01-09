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

/**
 * TikTok video query response
 */
export interface TikTokVideoQueryResponse {
  data: {
    videos: TikTokVideo[];
  };
  error?: {
    code: string;
    message: string;
    log_id?: string;
  };
}

/**
 * TikTok video search request filters
 */
export interface TikTokVideoSearchFilters {
  video_ids?: string[];
  create_date_filter?: {
    min: number; // Unix timestamp
    max: number; // Unix timestamp
  };
}

/**
 * TikTok video search request body
 */
export interface TikTokVideoSearchRequest {
  filters: TikTokVideoSearchFilters;
  max_count?: number;
  cursor?: number;
}
