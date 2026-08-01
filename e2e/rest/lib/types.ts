/**
 * Minimal response shapes for the public Post for Me API.
 *
 * These are intentionally loose, black-box types — just enough to get
 * autocomplete and catch typos in the integration tests. They are NOT imported
 * from `api/src` on purpose: the integration suite treats the API as an opaque
 * HTTP service, exactly like a real consumer would.
 */

export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Cursor-paginated shape used by the social account feeds endpoint. */
export interface CursorPaginated<T> {
  data: T[];
  meta: {
    cursor?: string;
    limit: number;
    next: string | null;
    has_more?: boolean;
  };
}

export interface UploadUrl {
  upload_url: string;
  media_url: string;
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  user_id: string;
  access_token: string;
  refresh_token?: string | null;
  access_token_expires_at: string;
  status?: 'connected' | 'disconnected';
  external_id?: string | null;
  [key: string]: unknown;
}

export interface SocialPost {
  id: string;
  caption: string;
  status: 'draft' | 'scheduled' | 'processing' | 'processed';
  external_id?: string | null;
  social_accounts: SocialAccount[];
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SocialPostResult {
  id: string;
  [key: string]: unknown;
}

export interface Webhook {
  id: string;
  url: string;
  event_types: string[];
  [key: string]: unknown;
}

export interface AuthUrlResponse {
  url: string;
  platform: string;
}

export interface DeleteResponse {
  success: boolean;
}

/** Shape NestJS uses for thrown `HttpException`s. */
export interface ApiError {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  errors?: string[];
  [key: string]: unknown;
}
