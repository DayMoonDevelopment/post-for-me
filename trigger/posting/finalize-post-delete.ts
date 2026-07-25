import { logger, tasks } from "@trigger.dev/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { transformPostData } from "./transform-post-data";

const POST_WITH_RELATIONS_SELECT = `
  *,
  social_post_provider_connections (
    social_provider_connections (
      *
    )
  ),
  social_post_media (
    url,
    thumbnail_url,
    thumbnail_timestamp_ms,
    provider,
    provider_connection_id,
    tags
  ),
  social_post_configurations (
    caption,
    provider,
    provider_connection_id,
    provider_data
  )
`;

/**
 * Finalizes a post that is being deleted from its platforms: if no result is
 * still `deleting`, flips the post from `deleting` to `deleted`/`delete_failed`
 * and emits `social.post.deleted`. Only results that were actually attempted
 * (`deleting`/`deleted`/`delete_failed`) decide the outcome — `not_deleted`
 * results (never queued: original publish failures) are ignored. The
 * `.eq("status", "deleting")` guard ensures exactly one caller wins, so this is
 * safe to call from every parallel delete task and from the reconciliation cron.
 */
export async function finalizePostDeleteIfComplete({
  supabaseClient,
  postId,
  projectId,
}: {
  supabaseClient: SupabaseClient;
  postId: string;
  projectId: string;
}): Promise<void> {
  const { data: remainingResults, error: remainingResultsError } =
    await supabaseClient
      .from("social_post_results")
      .select("delete_status")
      .eq("post_id", postId);

  if (remainingResultsError) {
    logger.error("Failed to load remaining results for finalization", {
      remainingResultsError,
    });
    return;
  }

  const stillPending = (remainingResults ?? []).some(
    (r) => r.delete_status === "deleting",
  );

  if (stillPending) {
    return;
  }

  const attempted = (remainingResults ?? []).filter(
    (r) => r.delete_status !== "not_deleted",
  );
  const allDeleted =
    attempted.length > 0 &&
    attempted.every((r) => r.delete_status === "deleted");

  const { data: finalizedPosts, error: finalizeError } = await supabaseClient
    .from("social_posts")
    .update({
      status: allDeleted ? "deleted" : "delete_failed",
    })
    .eq("id", postId)
    .eq("status", "deleting")
    .select(POST_WITH_RELATIONS_SELECT);

  if (finalizeError) {
    logger.error("Failed to finalize post delete status", { finalizeError });
    return;
  }

  if (finalizedPosts && finalizedPosts.length > 0) {
    await tasks.trigger("process-webhooks", {
      projectId,
      eventType: "social.post.deleted",
      // Emit the same post shape as `social.post.updated` so every post-level
      // webhook carries an identical schema.
      eventData: transformPostData(finalizedPosts[0]),
    });
  }
}
