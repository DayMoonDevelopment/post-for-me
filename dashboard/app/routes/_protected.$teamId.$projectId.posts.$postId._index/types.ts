import type { Route } from "./+types/route";

export type LoaderData = Route.ComponentProps["loaderData"];

export type PostResultPlatformData = {
  id: string | null;
  url: string | null;
  username?: string;
};

export type PostResultMedia = {
  url: string;
  thumbnail_url?: string | null;
};

/** Resolved from `social_provider_connections` in the loader. */
export type PostResultAccount = {
  id: string;
  provider: string;
  username: string | null;
  profile_photo_url: string | null;
};

export type PostResult = {
  id: string;
  post_id: string;
  social_account_id: string;
  success: boolean;
  error: string | null;
  /** Raw provider request/response logs + platform-specific metadata. */
  details: unknown;
  platform_data: PostResultPlatformData | null;
  media?: PostResultMedia[] | null;
  account?: PostResultAccount | null;
};

export type Post = {
  id: string;
  caption: string;
  status: "draft" | "processing" | "processed" | "posted" | "error";
  scheduled_at: null;
  platform_configurations: null;
  account_configurations: Array<Record<string, never>>;
  media: null;
  social_accounts: string[];
  created_at: string;
  updated_at: string;
};
