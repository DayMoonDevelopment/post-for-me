import type { TypedSupabaseClient } from "~/lib/.server/supabase";

/**
 * The normalized result of a provider token-exchange: one connected account.
 * A single OAuth return can yield MANY of these (a Facebook login exposes every
 * Page the user administers, LinkedIn adds org pages, etc.), so every
 * `get<Provider>SocialProviderConnection` returns an array.
 */
export interface SocialProviderConnection {
  access_token: string;
  access_token_expires_at: Date;
  refresh_token?: string;
  refresh_token_expires_at?: Date;
  social_provider_metadata?: any;
  social_provider_photo_url?: string;
  social_provider_user_id: string;
  social_provider_user_name: string;
}

/** Everything a per-provider exchange needs: the redirect this flow used, the
 * live request (its query carries `code`/`state`/`oauth_verifier`/…), the
 * project's app credentials, and a service-role client for the few providers
 * that stash secrets in `social_provider_connection_oauth_data` (x, bluesky). */
export interface SocialProviderInfo {
  appCredentials: {
    appId?: string | null;
    appSecret?: string | null;
  };
  projectId: string;
  redirectUri: string;
  request: Request;
  supabaseServiceRole: TypedSupabaseClient;
}

/** The provider ids that map to a `social_provider_connections.provider` value
 * after normalization (the `instagram_w_facebook` variant collapses to
 * `instagram`, `tiktok_business` to `tiktok`). */
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
