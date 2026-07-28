import { logger, schedules, tasks } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase.types";
import { finalizePostDeleteIfComplete } from "./posting/finalize-post-delete";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Must exceed the delete-from-platform task's maxDuration (1h) so we never race
// a delete that is still legitimately running or retrying.
const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000;

// Fail-out reconciliation for posts stuck in `deleting`. A post only leaves
// `deleting` when a delete task runs finalization; if a task is dropped/killed
// before writing its result, the post would otherwise stay `deleting` forever.
export const reconcileStuckDeletes = schedules.task({
  cron: { pattern: "*/10 * * * *", environments: ["PRODUCTION"] },
  id: "reconcile-stuck-deletes",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

    const { data: stuckPosts, error } = await supabaseClient
      .from("social_posts")
      .select("id, project_id")
      .eq("status", "deleting")
      .lt("updated_at", cutoff)
      .limit(100);

    if (error) {
      logger.error("Failed to load stuck deletes", { error });
      throw new Error(error.message);
    }

    if (!stuckPosts || stuckPosts.length === 0) {
      logger.info("No stuck deletes to reconcile");
      return;
    }

    logger.info("Reconciling stuck deletes", { count: stuckPosts.length });

    for (const post of stuckPosts) {
      // Any result still `deleting` past the threshold had its delete task die
      // before reporting back — fail it out so the post can finalize.
      const { data: stuckResults, error: stuckResultsError } =
        await supabaseClient
          .from("social_post_results")
          .select("id, post_id, provider_connection_id")
          .eq("post_id", post.id)
          .eq("delete_status", "deleting");

      if (stuckResultsError) {
        logger.error("Failed to load stuck results", {
          postId: post.id,
          stuckResultsError,
        });
        continue;
      }

      if (stuckResults && stuckResults.length > 0) {
        const { error: updateError } = await supabaseClient
          .from("social_post_results")
          .update({
            delete_status: "delete_failed",
            delete_error_message: "Deletion timed out",
          })
          .in(
            "id",
            stuckResults.map((r) => r.id),
          );

        if (updateError) {
          logger.error("Failed to fail-out stuck results", {
            postId: post.id,
            updateError,
          });
          continue;
        }

        for (const result of stuckResults) {
          await tasks.trigger("process-webhooks", {
            projectId: post.project_id,
            eventType: "social.post.result.deleted",
            eventData: {
              id: result.id,
              post_id: result.post_id,
              social_account_id: result.provider_connection_id,
              success: false,
              error: "Deletion timed out",
            },
          });
        }
      }

      await finalizePostDeleteIfComplete({
        supabaseClient,
        postId: post.id,
        projectId: post.project_id,
      });
    }
  },
});
