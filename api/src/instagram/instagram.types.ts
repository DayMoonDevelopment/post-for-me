/**
 * Instagram Graph API Response Types
 * Based on Meta's Instagram Graph API documentation
 */

/**
 * Instagram media item from the Graph API
 */
export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

/**
 * Paging cursors for pagination
 */
export interface PagingCursors {
  before?: string;
  after?: string;
}

/**
 * Paging information
 */
export interface Paging {
  cursors?: PagingCursors;
  next?: string;
  previous?: string;
}

/**
 * Instagram media list response
 */
export interface InstagramMediaListResponse {
  data: InstagramMediaItem[];
  paging?: Paging;
}

/**
 * Instagram refresh token response
 */
export interface InstagramRefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Facebook refresh token response
 */
export interface FacebookRefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/**
 * Account metadata for Instagram connections
 */
export interface InstagramAccountMetadata {
  connection_type?: 'instagram' | 'facebook';
}
