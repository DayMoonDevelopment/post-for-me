import { createClient } from "@supabase/supabase-js";
import { idempotencyKeys, logger, schedules, tasks } from "@trigger.dev/sdk";
import { TikTokPostClient } from "./posting/platforms/tiktok-post-client";
import { TikTokBusinessPostClient } from "./posting/platforms/tiktok_business-post-client";
import { handleTokenRefresh, shouldRefreshToken } from "./posting/token-refresh";
import { PlatformAppCredentials, SocialAccount } from "./posting/post.types";
import { Database } from "./supabase.types";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_RECONCILIATION_ATTEMPTS = 50;
const PROCESSING_STATUSES = [
  "PROCESSING",
  "PROCESSING_DOWNLOAD",
  "PROCESSING_UPLOAD",
];

type ReconcilableClient = TikTokPostClient | TikTokBusinessPostClient;

const createTikTokClient = (
  provider: "tiktok" | "tiktok_business",
  appCredentials: PlatformAppCredentials,
): ReconcilableClient =>
  provider === "tiktok_business"
    ? new TikTokBusinessPostClient(supabaseClient, appCredentials)
    : new TikTokPostClient(supabaseClient, appCredentials);

type PendingResultRow = {
  id: string;
  post_id: string;
  details: any;
  reconciliation_attempts: number;
  social_provider_connections: {
    id: string;
    provider: "tiktok" | "tiktok_business";
    project_id: string;
    access_token: string;
    refresh_token: string | null;
    access_token_expires_at: string | null;
    refresh_token_expires_at: string | null;
    social_provider_user_id: string;
    social_provider_user_name: string | null;
    social_provider_metadata: any;
    projects: {
      team_id: string;
      teams: { stripe_customer_id: string | null } | null;
    } | null;
  };
};

const bumpAttempts = async (id: string, currentAttempts: number) => {
  const { error } = await supabaseClient
    .from("social_post_results")
    .update({ reconciliation_attempts: currentAttempts + 1 })
    .eq("id", id);

  if (error) {
    logger.error("Failed to bump reconciliation attempts", { id, error });
  }
};

const resolveRow = async ({
  row,
  success,
  errorMessage,
  details,
  teamId,
  stripeCustomerId,
}: {
  row: PendingResultRow;
  success: boolean;
  errorMessage: string | null;
  details: any;
  teamId?: string | null;
  stripeCustomerId?: string | null;
}) => {
  const { data: updated, error } = await supabaseClient
    .from("social_post_results")
    .update({
      success,
      is_processing: false,
      error_message: errorMessage,
      details,
      reconciliation_attempts: row.reconciliation_attempts + 1,
    })
    .eq("id", row.id)
    .select()
    .single();

  if (error || !updated) {
    logger.error("Failed to update reconciled post result", { id: row.id, error });
    return;
  }

  if (success && teamId && stripeCustomerId) {
    void idempotencyKeys
      .create(["increment-team-usage", updated.id], { scope: "global" })
      .then((idempotencyKey) =>
        tasks.trigger(
          "increment-team-usage",
          { stripe_customer_id: stripeCustomerId, team_id: teamId },
          { idempotencyKey, idempotencyKeyTTL: "1h" },
        ),
      )
      .catch((error) => {
        logger.error("Failed to trigger increment team usage during reconciliation", {
          social_post_result_id: updated.id,
          error,
        });
      });
  }

  await tasks.trigger("process-webhooks", {
    projectId: row.social_provider_connections.project_id,
    eventType: "social.post.result.updated",
    eventData: {
      details: updated.details,
      id: updated.id,
      error: updated.error_message,
      platform_data: {
        id: updated.provider_post_id,
        url: updated.provider_post_url,
      },
      post_id: updated.post_id,
      social_account_id: updated.provider_connection_id,
      success: updated.success,
      is_processing: updated.is_processing,
    },
  });
};

const reconcileRow = async ({
  row,
  client,
}: {
  row: PendingResultRow;
  client: ReconcilableClient;
}) => {
  const connection = row.social_provider_connections;
  const account: SocialAccount = {
    id: connection.id,
    provider: connection.provider as SocialAccount["provider"],
    social_provider_user_name: connection.social_provider_user_name,
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    access_token_expires_at: connection.access_token_expires_at
      ? new Date(connection.access_token_expires_at)
      : null,
    refresh_token_expires_at: connection.refresh_token_expires_at
      ? new Date(connection.refresh_token_expires_at)
      : null,
    social_provider_user_id: connection.social_provider_user_id,
    social_provider_metadata: connection.social_provider_metadata,
  };

  if (shouldRefreshToken(account)) {
    const refreshed = await handleTokenRefresh({
      supabaseClient,
      postClient: client,
      account,
    });

    if (!refreshed.success) {
      logger.error("Failed to refresh token during reconciliation", {
        social_post_result_id: row.id,
        accountId: account.id,
        error: refreshed.error,
      });
      await bumpAttempts(row.id, row.reconciliation_attempts);
      return;
    }
  }

  const publishId = row.details?.publish_id;
  if (!publishId) {
    logger.error("Reconciliation row missing publish_id, giving up", {
      id: row.id,
    });
    await resolveRow({
      row,
      success: false,
      errorMessage: "Unable to reconcile: missing publish_id",
      details: row.details,
    });
    return;
  }

  try {
    const { status } = await client.checkDraftPublishStatus({
      publishId,
      account,
    });

    if (PROCESSING_STATUSES.includes(status)) {
      await bumpAttempts(row.id, row.reconciliation_attempts);
      return;
    }

    await resolveRow({
      row,
      success: true,
      errorMessage: null,
      details: {
        ...row.details,
        status: "Saved as draft",
        message:
          "Content saved as draft in TikTok. Check your TikTok inbox notifications to continue editing and publish.",
        reconciled_at: new Date().toISOString(),
      },
      teamId: connection.projects?.team_id,
      stripeCustomerId: connection.projects?.teams?.stripe_customer_id,
    });
  } catch (statusError) {
    logger.error("TikTok draft reconciliation resolved to failure", {
      id: row.id,
      error: statusError,
    });
    await resolveRow({
      row,
      success: false,
      errorMessage: statusError.message,
      details: {
        ...row.details,
        status: "Processing failed",
        message: statusError.message,
        reconciled_at: new Date().toISOString(),
      },
    });
  }
};

export const reconcileTikTokDraftResults = schedules.task({
  cron: { pattern: "*/10 * * * *", environments: ["PRODUCTION"] },
  id: "reconcile-tiktok-draft-results",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    const now = new Date().toISOString();

    const { error: expireError } = await supabaseClient
      .from("social_post_results")
      .update({ is_processing: false })
      .eq("is_processing", true)
      .or(
        `reconciliation_deadline_at.lte.${now},reconciliation_attempts.gte.${MAX_RECONCILIATION_ATTEMPTS}`,
      );

    if (expireError) {
      logger.error("Failed to expire stale reconciliation rows", {
        error: expireError,
      });
    }

    const { data: rows, error } = await supabaseClient
      .from("social_post_results")
      .select(
        `
        id, post_id, details, reconciliation_attempts,
        social_provider_connections!inner(
          id, provider, project_id, access_token, refresh_token,
          access_token_expires_at, refresh_token_expires_at,
          social_provider_user_id, social_provider_user_name, social_provider_metadata,
          projects( team_id, teams(stripe_customer_id) )
        )
        `,
      )
      .eq("is_processing", true)
      .in("social_provider_connections.provider", ["tiktok", "tiktok_business"])
      .lt("reconciliation_attempts", MAX_RECONCILIATION_ATTEMPTS)
      .gt("reconciliation_deadline_at", now)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      logger.error("Failed to fetch processing TikTok draft results", { error });
      throw new Error(`Failed to fetch processing results: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
      logger.info("No TikTok draft results pending reconciliation");
      return;
    }

    logger.info(`Reconciling ${rows.length} TikTok draft result(s)`);

    const pendingRows = rows as unknown as PendingResultRow[];
    const projectIds = [
      ...new Set(pendingRows.map((row) => row.social_provider_connections.project_id)),
    ];

    const { data: appCredentialsRows, error: credentialsError } =
      await supabaseClient
        .from("social_provider_app_credentials")
        .select("*")
        .in("project_id", projectIds);

    if (credentialsError) {
      logger.error("Failed to fetch app credentials", {
        error: credentialsError,
      });
      throw new Error(
        `Failed to fetch app credentials: ${credentialsError.message}`,
      );
    }

    const groups = new Map<string, PendingResultRow[]>();
    for (const row of pendingRows) {
      const key = `${row.social_provider_connections.provider}:${row.social_provider_connections.project_id}`;
      const groupRows = groups.get(key) ?? [];
      groupRows.push(row);
      groups.set(key, groupRows);
    }

    await Promise.allSettled(
      Array.from(groups.values()).map(async (groupRows) => {
        const { provider, project_id: projectId } =
          groupRows[0].social_provider_connections;

        const credentialRow = (appCredentialsRows ?? []).find(
          (credential) =>
            credential.provider === provider && credential.project_id === projectId,
        );

        if (!credentialRow) {
          logger.error("No app credentials found for provider", {
            provider,
            projectId,
          });
          return;
        }

        const client = createTikTokClient(provider, {
          app_id: credentialRow.app_id || "",
          app_secret: credentialRow.app_secret || "",
        });

        for (const row of groupRows) {
          await reconcileRow({ row, client });
        }
      }),
    );

    logger.info("TikTok draft result reconciliation complete");
  },
});
