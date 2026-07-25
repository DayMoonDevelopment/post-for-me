import { createClient } from "@supabase/supabase-js";
import { logger, task, tags, tasks } from "@trigger.dev/sdk";
import { createPostClient } from "./posting/create-post-client";
import {
  handleTokenRefresh,
  platformsToAlwaysRefresh,
} from "./posting/token-refresh";
import { DeleteFromPlatformData, DeleteResult, SocialAccount } from "./posting/post.types";
import { differenceInDays } from "date-fns";
import { Database } from "./supabase.types";
import { finalizePostDeleteIfComplete } from "./posting/finalize-post-delete";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const deleteFromPlatform = task({
  id: "delete-from-platform",
  maxDuration: 3600,
  retry: {
    maxAttempts: 2,
  },
  machine: "small-2x",
  run: async (payload: DeleteFromPlatformData): Promise<DeleteResult> => {
    const { resultId, postId, projectId, platform, account, providerPostId, appCredentials } =
      payload;
    let deleteResult: DeleteResult | null = null;

    try {
      await tags.add(`${account.id}`);

      logger.info("Starting platform delete", { ...payload });

      // Platform deletes are not idempotent: deleting an already-deleted post
      // returns an error on most platforms, which would flip a previously
      // successful `deleted` result to `delete_failed` on a task retry. If this
      // result was already deleted on a prior attempt, skip the platform call
      // and let the finalization logic below run idempotently.
      const { data: existingResult } = await supabaseClient
        .from("social_post_results")
        .select("delete_status")
        .eq("id", resultId)
        .maybeSingle();

      if (existingResult?.delete_status === "deleted") {
        logger.info("Result already deleted on a prior attempt; skipping platform delete", {
          resultId,
        });
        deleteResult = {
          provider_connection_id: account.id,
          success: true,
        };
      } else {
        const postClient = createPostClient({
          supabaseClient,
          platformName: platform,
          appCredentials,
        });

        if (
          platformsToAlwaysRefresh.includes(account.provider) ||
          differenceInDays(
            account.access_token_expires_at || new Date(),
            new Date(),
          ) <= 7
        ) {
          logger.info("Refreshing Token", {
            platform: account.provider,
            account,
          });
          const refreshed = await handleTokenRefresh({
            supabaseClient,
            postClient,
            account: account as SocialAccount,
          });

          if (!refreshed.success) {
            logger.error("Failed to refresh token", {
              account,
              error: refreshed.error,
            });
            deleteResult = {
              provider_connection_id: account.id,
              success: false,
              error_message: refreshed.error,
            };

            throw new Error("Invalid Token");
          }
        }

        deleteResult = await postClient.delete({ account, providerPostId });
      }
    } catch (error) {
      logger.error("Failed Deleting Platform Post", { error });

      if (!deleteResult) {
        deleteResult = {
          provider_connection_id: account.id,
          success: false,
          error_message:
            "Unexpected Error: Delete Status Unavailable, Please check the social account.",
          details: { error },
        };
      }
    }

    await tags.add(`result_${deleteResult.success ? "deleted" : "delete_error"}`);

    logger.info("Saving delete result", { deleteResult });
    const { error: updateResultError } = await supabaseClient
      .from("social_post_results")
      .update({
        delete_status: deleteResult.success ? "deleted" : "delete_failed",
        delete_error_message: deleteResult.error_message ?? null,
        deleted_at: deleteResult.success ? new Date().toISOString() : null,
      })
      .eq("id", resultId);

    if (updateResultError) {
      logger.error("Failed to update post result", { updateResultError });
    }

    await tasks.trigger("process-webhooks", {
      projectId,
      eventType: "social.post.result.deleted",
      eventData: {
        id: resultId,
        post_id: postId,
        social_account_id: account.id,
        success: deleteResult.success,
        error: deleteResult.error_message,
        details: deleteResult.details,
      },
    });

    await finalizePostDeleteIfComplete({ supabaseClient, postId, projectId });

    logger.info("Platform delete complete", { ...deleteResult });
    return deleteResult;
  },
});
