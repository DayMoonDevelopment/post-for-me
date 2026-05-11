import { logger, schedules } from "@trigger.dev/sdk";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PostClient } from "./posting/post-client";
import { TwitterPostClient } from "./posting/platforms/twitter-post-client";
import { InstagramPostClient } from "./posting/platforms/instagram-post-client";
import { FacebookPostClient } from "./posting/platforms/facebook-post-client";
import { LinkedInPostClient } from "./posting/platforms/linkedin-post-client";
import { TikTokPostClient } from "./posting/platforms/tiktok-post-client";
import { BlueskyPostClient } from "./posting/platforms/bluesky-post-client";
import { ThreadsPostClient } from "./posting/platforms/threads-post-client";
import { PinterestPostClient } from "./posting/platforms/pinterest-post-client";
import { YouTubePostClient } from "./posting/platforms/youtube-post-client";
import { TikTokBusinessPostClient } from "./posting/platforms/tiktok_business-post-client";
import { PlatformAppCredentials, SocialAccount } from "./posting/post.types";

import { Database } from "./supabase.types";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const createPostClient = ({
  supabaseClient,
  platformName,
  appCredentials,
}: {
  supabaseClient: SupabaseClient;
  platformName: string;
  appCredentials: PlatformAppCredentials;
}): PostClient => {
  switch (platformName) {
    case "x":
      return new TwitterPostClient(supabaseClient, appCredentials);
    case "instagram":
      return new InstagramPostClient(supabaseClient, appCredentials);
    case "facebook":
      return new FacebookPostClient(supabaseClient, appCredentials);
    case "linkedin":
      return new LinkedInPostClient(supabaseClient, appCredentials);
    case "tiktok":
      return new TikTokPostClient(supabaseClient, appCredentials);
    case "bluesky":
      return new BlueskyPostClient(supabaseClient, appCredentials);
    case "threads":
      return new ThreadsPostClient(supabaseClient, appCredentials);
    case "pinterest":
      return new PinterestPostClient(supabaseClient, appCredentials);
    case "youtube":
      return new YouTubePostClient(supabaseClient, appCredentials);
    case "tiktok_business":
      return new TikTokBusinessPostClient(supabaseClient, appCredentials);
    default:
      throw Error("Invalid Platform");
  }
};

const handleTokenRefresh = async ({
  postClient,
  account,
}: {
  postClient: PostClient;
  account: SocialAccount;
}): Promise<{ success: boolean; error?: string; accountId: string }> => {
  try {
    logger.info(
      `Refreshing token for ${account.provider} account ${account.id}`,
    );

    const { access_token, expires_at, refresh_token } =
      await postClient.refreshAccessToken(account);

    if (!access_token) {
      const error = `Failed to refresh ${account.provider} token for account ${account.id}`;
      logger.error(error);
      return {
        success: false,
        error,
        accountId: account.id,
      };
    }

    const updateData: {
      access_token?: string;
      access_token_expires_at?: string;
      refresh_token?: string;
    } = {
      access_token,
      access_token_expires_at: expires_at,
    };

    if (refresh_token) {
      updateData.refresh_token = refresh_token;
    }

    const { error: updateError } = await supabaseClient
      .from("social_provider_connections")
      .update(updateData)
      .eq("id", account.id);

    if (updateError) {
      logger.error(`Database update error for account ${account.id}:`, {
        error: updateError,
      });
      return {
        success: false,
        error: updateError.message,
        accountId: account.id,
      };
    }

    logger.info(
      `Successfully refreshed token for ${account.provider} account ${account.id}`,
    );
    return {
      success: true,
      accountId: account.id,
    };
  } catch (refreshError) {
    logger.error(
      `Token refresh error for account ${account.id}:`,
      refreshError,
    );
    return {
      success: false,
      error: refreshError.message,
      accountId: account.id,
    };
  }
};

const refreshAccountsByProviderAndProject = async ({
  provider,
  projectId,
  accounts,
  appCredentials,
}: {
  provider: string;
  projectId: string;
  accounts: SocialAccount[];
  appCredentials: PlatformAppCredentials;
}): Promise<{ success: number; failed: number; errors: string[] }> => {
  logger.info(
    `Processing ${accounts.length} ${provider} accounts for project ${projectId}`,
  );

  try {
    const postClient = createPostClient({
      supabaseClient,
      platformName: provider,
      appCredentials,
    });

    const refreshPromises = accounts.map((account) =>
      handleTokenRefresh({ postClient, account }),
    );

    const results = await Promise.allSettled(refreshPromises);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        success++;
      } else {
        failed++;
        errors.push(
          `Account ${accounts[index].id}: ${result.status == "rejected" ? result.reason : result.value.error}`,
        );
      }
    });

    logger.info(
      `${provider} (project ${projectId}) refresh complete: ${success} success, ${failed} failed`,
    );
    return { success, failed, errors };
  } catch (error) {
    logger.error(
      `Error processing ${provider} accounts for project ${projectId}:`,
      error,
    );
    return {
      success: 0,
      failed: accounts.length,
      errors: [
        `Failed to process ${provider} accounts for project ${projectId}: ${error.message}`,
      ],
    };
  }
};

export const refreshAccountTokens = schedules.task({
  cron: { pattern: "0 */12 * * *", environments: ["PRODUCTION"] },
  id: "refresh-account-tokens",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    logger.info("Starting account token refresh process");

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get accounts that need token refresh
    const { data: accounts, error: accountsError } = await supabaseClient
      .from("social_provider_connections")
      .select("*")
      .lte("access_token_expires_at", sevenDaysFromNow.toISOString())
      .in("provider", ["facebook", "instagram", "threads", "pinterest"])
      .order("access_token_expires_at", { ascending: true })
      .limit(50);

    if (accountsError) {
      logger.error("Failed to fetch accounts:", { error: accountsError });
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      logger.info("No accounts need token refresh");
      return { success: 0, failed: 0, errors: [] };
    }

    logger.info(`Found ${accounts.length} accounts needing token refresh`);

    // Group accounts by provider and project_id
    const accountsByProviderAndProject = accounts.reduce(
      (groups, account) => {
        const groupKey = `${account.provider}:${account.project_id}`;
        if (!groups[groupKey]) {
          groups[groupKey] = {
            provider: account.provider,
            projectId: account.project_id,
            accounts: [],
          };
        }
        groups[groupKey].accounts.push(account as SocialAccount);
        return groups;
      },
      {} as Record<
        string,
        { provider: string; projectId: string; accounts: SocialAccount[] }
      >,
    );

    const groupSummary = Object.keys(accountsByProviderAndProject).map(
      (groupKey) => {
        const group = accountsByProviderAndProject[groupKey];
        return `${group.provider} (project: ${group.projectId}): ${group.accounts.length} accounts`;
      },
    );
    logger.info(`Grouped accounts by provider and project:`, {
      groups: groupSummary,
    });

    // Get unique project IDs to fetch app credentials
    const projectIds = [
      ...new Set(
        Object.values(accountsByProviderAndProject).map(
          (group) => group.projectId,
        ),
      ),
    ];
    const { data: appCredentials, error: credentialsError } =
      await supabaseClient
        .from("social_provider_app_credentials")
        .select("*")
        .in("project_id", projectIds);

    if (credentialsError) {
      logger.error("Failed to fetch app credentials:", {
        error: credentialsError,
      });
      throw new Error(
        `Failed to fetch app credentials: ${credentialsError.message}`,
      );
    }

    // Process each provider/project group in parallel
    const groupPromises = Object.keys(accountsByProviderAndProject).map(
      async (groupKey) => {
        const {
          provider,
          projectId,
          accounts: groupAccounts,
        } = accountsByProviderAndProject[groupKey];

        let credentials: PlatformAppCredentials;

        if (provider === "bluesky") {
          // Bluesky uses hardcoded credentials
          credentials = {
            app_id: "blue_sky_app_id",
            app_secret: "blue_sky_app_secret",
          };
        } else {
          const providerCredentials = appCredentials?.find(
            (cred) =>
              cred.provider === provider && cred.project_id === projectId,
          );

          if (!providerCredentials) {
            logger.error(
              `No app credentials found for provider ${provider} in project ${projectId}`,
            );
            return {
              provider,
              projectId,
              success: 0,
              failed: groupAccounts.length,
              errors: [
                `No app credentials found for provider ${provider} in project ${projectId}`,
              ],
            };
          }

          credentials = {
            app_id: providerCredentials.app_id || "",
            app_secret: providerCredentials.app_secret || "",
          };
        }

        const result = await refreshAccountsByProviderAndProject({
          provider,
          projectId,
          accounts: groupAccounts,
          appCredentials: credentials,
        });
        return { provider, projectId, ...result };
      },
    );

    const groupResults = await Promise.allSettled(groupPromises);

    logger.info("Refresh Results", { results: groupResults });

    logger.info(`Token refresh complete`);
  },
});
