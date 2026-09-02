import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@trigger.dev/sdk";
import { differenceInDays } from "date-fns";
import { PostClient } from "./post-client";
import { SocialAccount } from "./post.types";

const platformsToAlwaysRefresh = ["youtube", "bluesky"];

export const shouldRefreshToken = (account: SocialAccount): boolean =>
  platformsToAlwaysRefresh.includes(account.provider) ||
  differenceInDays(
    account.access_token_expires_at || new Date(),
    new Date(),
  ) <= 7;

export const handleTokenRefresh = async ({
  supabaseClient,
  postClient,
  account,
}: {
  supabaseClient: SupabaseClient;
  postClient: PostClient;
  account: SocialAccount;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { access_token, expires_at, refresh_token } =
      await postClient.refreshAccessToken(account);

    if (!access_token) {
      const error = `Failed to refresh ${account.provider} token for account ${account.id}`;
      logger.error(error);

      return { success: false, error };
    }

    const updateData: {
      access_token?: string;
      access_token_expires_at?: string;
      refresh_token?: string;
    } = {
      access_token,
      access_token_expires_at: expires_at,
    };

    account.access_token = access_token;
    account.access_token_expires_at = new Date(expires_at);

    if (refresh_token) {
      updateData.refresh_token = refresh_token;
      account.refresh_token = refresh_token;
    }

    const { error } = await supabaseClient
      .from("social_provider_connections")
      .update(updateData)
      .eq("id", account.id);

    if (error) {
      logger.error("Failed to persist refreshed token", { error });

      return { success: false, error: error.message };
    }
  } catch (refreshError) {
    logger.error("Token refresh error", { error: refreshError });

    return { success: false, error: refreshError.message };
  }

  return { success: true };
};
