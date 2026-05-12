import type { Database } from "~/lib/.server/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SocialProviderConnection {
  access_token: string;
  refresh_token?: string;
  access_token_expires_at: Date;
  refresh_token_expires_at?: Date;
  social_provider_user_id: string;
  social_provider_user_name: string;
  social_provider_photo_url?: string;
  social_provider_metadata?: any;
}

export interface SocialProviderInfo {
  projectId: string;
  redirectUri: string;
  request: Request;
  appCredentials: {
    appId?: string | null;
    appSecret?: string | null;
  };
  supabaseServiceRole: SupabaseClient<Database>;
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
