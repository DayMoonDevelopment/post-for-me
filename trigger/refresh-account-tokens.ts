import { logger, schedules } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { createPostClient } from "./posting/create-post-client";
import { handleTokenRefresh as sharedHandleTokenRefresh } from "./posting/token-refresh";
import { PlatformAppCredentials, SocialAccount } from "./posting/post.types";

import { Database } from "./supabase.types";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const handleTokenRefresh = async ({
  postClient,
  account,
}: {
  postClient: ReturnType<typeof createPostClient>;
  account: SocialAccount;
}): Promise<{ success: boolean; error?: string; accountId: string }> => {
  logger.info(
    `Refreshing token for ${account.provider} account ${account.id}`,
  );

  const result = await sharedHandleTokenRefresh({
    supabaseClient,
    postClient,
    account,
  });

  if (!result.success) {
    logger.error(`Token refresh failed for account ${account.id}:`, {
      error: result.error,
    });
  } else {
    logger.info(
      `Successfully refreshed token for ${account.provider} account ${account.id}`,
    );
  }

  return { ...result, accountId: account.id };
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

    // Get accounts that need token refresh. X OAuth1 accounts are
    // deliberately excluded here (queried separately below) - their tokens
    // never expire, so letting them compete for this shared, limited batch
    // would risk starving providers whose tokens actually break if not
    // refreshed in time.
    const { data: standardAccounts, error: standardAccountsError } =
      await supabaseClient
        .from("social_provider_connections")
        .select("*")
        .lte("access_token_expires_at", sevenDaysFromNow.toISOString())
        .in("provider", ["facebook", "instagram", "threads", "pinterest"])
        .order("access_token_expires_at", { ascending: true })
        .limit(50);

    if (standardAccountsError) {
      logger.error("Failed to fetch accounts:", {
        error: standardAccountsError,
      });
      throw new Error(
        `Failed to fetch accounts: ${standardAccountsError.message}`,
      );
    }

    // X OAuth2 accounts get their own independent batch budget so they
    // can't be crowded out by (or crowd out) the providers above.
    const { data: xOAuth2Accounts, error: xOAuth2AccountsError } =
      await supabaseClient
        .from("social_provider_connections")
        .select("*")
        .eq("provider", "x")
        .contains("social_provider_metadata", { connection_type: "oauth2" })
        .lte("access_token_expires_at", sevenDaysFromNow.toISOString())
        .order("access_token_expires_at", { ascending: true })
        .limit(50);

    if (xOAuth2AccountsError) {
      logger.error("Failed to fetch x accounts:", {
        error: xOAuth2AccountsError,
      });
      throw new Error(
        `Failed to fetch x accounts: ${xOAuth2AccountsError.message}`,
      );
    }

    const accounts = [
      ...(standardAccounts || []),
      ...(xOAuth2Accounts || []),
    ];

    if (!accounts || accounts.length === 0) {
      logger.info("No accounts need token refresh");
      return { success: 0, failed: 0, errors: [] };
    }

    logger.info(`Found ${accounts.length} accounts needing token refresh`);

    // Group accounts by provider, connection type (relevant for x, which can
    // have both OAuth1 and OAuth2 connections needing different app
    // credentials), and project_id
    const accountsByProviderAndProject = accounts.reduce(
      (groups, account) => {
        const isXOAuth2 =
          account.provider === "x" &&
          (
            account.social_provider_metadata as {
              connection_type?: string;
            } | null
          )?.connection_type === "oauth2";
        const credentialsProvider = isXOAuth2 ? "x_oauth2" : account.provider;
        const groupKey = `${credentialsProvider}:${account.project_id}`;
        if (!groups[groupKey]) {
          groups[groupKey] = {
            provider: account.provider,
            credentialsProvider,
            projectId: account.project_id,
            accounts: [],
          };
        }
        groups[groupKey].accounts.push(account as SocialAccount);
        return groups;
      },
      {} as Record<
        string,
        {
          provider: string;
          credentialsProvider: string;
          projectId: string;
          accounts: SocialAccount[];
        }
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
          credentialsProvider,
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
              cred.provider === credentialsProvider &&
              cred.project_id === projectId,
          );

          if (!providerCredentials) {
            logger.error(
              `No app credentials found for provider ${credentialsProvider} in project ${projectId}`,
            );
            return {
              provider,
              projectId,
              success: 0,
              failed: groupAccounts.length,
              errors: [
                `No app credentials found for provider ${credentialsProvider} in project ${projectId}`,
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
