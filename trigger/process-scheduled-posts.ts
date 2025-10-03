import { logger, schedules, tasks } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { Post } from "posting/post.types";

import { Database } from "@post-for-me/db";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const processScheduledPosts = schedules.task({
  cron: "*/2 * * * *",
  id: "process-scheduled-posts",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async () => {
    logger.info("Starting scheduled posts processing");
    const postIds: string[] = [];

    try {
      const { data: posts, error: postsError } = await supabaseClient
        .from("social_posts")
        .select(
          `
            id,
            project_id,
            caption,
            post_at,
            api_key,
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
            `
        )
        .eq("status", "scheduled")
        .lte("post_at", new Date().toISOString())
        .limit(10);

      if (postsError) {
        logger.error("Error fetching scheduled posts", {
          error: postsError,
        });
        throw new Error(postsError.message);
      }

      if (!posts || posts.length === 0) {
        logger.info("No scheduled posts found");
        return;
      }

      postIds.push(...posts.map((post) => post.id));

      logger.info("Updating scheduled posts status to processing", { postIds });
      const { error: updatePostsError } = await supabaseClient
        .from("social_posts")
        .update({ status: "processing" })
        .in("id", postIds);

      if (updatePostsError) {
        console.error(updatePostsError);
        throw new Error(updatePostsError.message);
      }

      logger.info("Processing scheduled posts", { count: posts.length });

      const result = await tasks.batchTrigger(
        "process-post",
        posts.map((post, index) => {
          const typedPost = post as Post;
          return {
            payload: {
              index,
              post: typedPost,
            },
          };
        })
      );

      logger.info("Scheduled posts triggered", { result });
    } catch (error) {
      logger.error("Error processing scheduled posts", error);
      throw error;
    }
  },
});
