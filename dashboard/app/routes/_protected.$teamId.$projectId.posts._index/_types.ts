export interface Post {
  id: string;
  project_id: string;
  external_id: string | null;
  status: "draft" | "scheduled" | "posting" | "posted" | "failed" | "cancelled";
  caption: string;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  api_key: string;
}

export interface SocialProviderConnection {
  id: string;
  provider: "instagram" | "facebook" | "x" | "linkedin" | "tiktok" | "youtube";
  social_provider_user_name: string | null;
  social_provider_profile_photo_url: string | null;
}

export interface PostProviderConnection {
  id: string;
  username: string | null;
  platform: string;
  external_id: string | null;
}

export interface PostMedia {
  url: string;
  thumbnail_url: string | null;
  thumbnail_timestamp_ms: number | null;
}

export interface PostWithConnections extends Post {
  social_accounts: PostProviderConnection[];
  media: PostMedia[];
  /**
   * Per-platform result status derived from social_post_results.
   * `true` = every account on that platform succeeded, `false` = at least one
   * failed (failure is prioritized). Absent when the post has no results yet.
   */
  provider_status?: Record<string, boolean>;
}

export interface LoaderData {
  success: boolean;
  error?: string;
  posts: PostWithConnections[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  projectId: string;
}
