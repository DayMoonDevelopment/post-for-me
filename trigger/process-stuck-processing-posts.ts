import {
  batch as triggerBatch,
  logger,
  runs,
  task,
  tasks,
  wait,
} from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { Post } from "./posting/post.types";

import { Database } from "./supabase.types";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 50;
const DEFAULT_BATCH_COMPLETION_THRESHOLD = 0.9;
const DEFAULT_POLL_INTERVAL_SECONDS = 10;
const FETCH_PAGE_SIZE = 1_000;
const POST_AT_START = "2026-06-23 07:44:05.877+00";
const POST_AT_END = "2026-06-23 11:53:47.873591+00";

type Payload = {
  batchCompletionThreshold?: number;
  pollIntervalSeconds?: number;
};

type BatchRunStatus = {
  completed: number;
  successful: number;
  failed: number;
  stillRunning: number;
};

const TERMINAL_RUN_STATUSES = new Set([
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getBatchRunStatus = async (
  runIds: string[],
  expectedRunCount: number,
): Promise<BatchRunStatus> => {
  const batchRuns = await Promise.all(
    runIds.map((runId) => runs.retrieve(runId)),
  );

  const completed = batchRuns.filter((run) =>
    TERMINAL_RUN_STATUSES.has(run.status),
  ).length;
  const successful = batchRuns.filter((run) => run.isSuccess).length;
  const failed = completed - successful;

  return {
    completed,
    successful,
    failed,
    stillRunning: expectedRunCount - completed,
  };
};

const POST_SELECT = `
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
    id,
    url,
    thumbnail_url,
    thumbnail_timestamp_ms,
    provider,
    provider_connection_id,
    tags,
    skip_processing
  ),
  social_post_configurations (
    caption,
    provider,
    provider_connection_id,
    provider_data
  )
`;

export const processStuckProcessingPosts = task({
  id: "process-stuck-processing-posts",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async (payload: Payload = {}) => {
    const batchCompletionThreshold = clamp(
      payload.batchCompletionThreshold ?? DEFAULT_BATCH_COMPLETION_THRESHOLD,
      0.01,
      1,
    );
    const pollIntervalSeconds = Math.max(
      payload.pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS,
      1,
    );

    logger.info("Starting stuck processing posts backfill", {
      status: "processing",
      postAtStart: POST_AT_START,
      postAtEnd: POST_AT_END,
      batchSize: BATCH_SIZE,
      batchCompletionThreshold,
      pollIntervalSeconds,
    });

    const { count, error: countError } = await supabaseClient
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing")
      .gte("post_at", POST_AT_START)
      .lt("post_at", POST_AT_END);

    if (countError) {
      logger.error("Error counting stuck processing posts", {
        error: countError,
      });
      throw new Error(countError.message);
    }

    const total = count ?? 0;

    if (total === 0) {
      logger.info("No stuck processing posts found");
      return {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        stillRunning: 0,
      };
    }

    logger.info("Found stuck processing posts", { total });

    const posts: Post[] = [];

    for (let from = 0; from < total; from += FETCH_PAGE_SIZE) {
      const to = from + FETCH_PAGE_SIZE - 1;
      const { data: page, error: postsError } = await supabaseClient
        .from("social_posts")
        .select(POST_SELECT)
        .eq("status", "processing")
        .gte("post_at", POST_AT_START)
        .lt("post_at", POST_AT_END)
        .order("post_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      if (postsError) {
        logger.error("Error fetching stuck processing posts", {
          error: postsError,
          from,
          to,
        });
        throw new Error(postsError.message);
      }

      if (!page || page.length === 0) {
        break;
      }

      posts.push(...(page as Post[]));
      logger.info("Fetched stuck processing posts page", {
        fetched: posts.length,
        total,
      });
    }

    const totalBatches = Math.ceil(posts.length / BATCH_SIZE);
    let successful = 0;
    let failed = 0;
    let stillRunning = 0;

    for (let start = 0; start < posts.length; start += BATCH_SIZE) {
      const postBatch = posts.slice(start, start + BATCH_SIZE);
      const batchNumber = Math.floor(start / BATCH_SIZE) + 1;
      const postIds = postBatch.map((post) => post.id);
      const requiredCompleted = Math.min(
        postBatch.length,
        Math.ceil(postBatch.length * batchCompletionThreshold),
      );

      logger.info("Processing stuck processing posts batch", {
        batchNumber,
        totalBatches,
        batchSize: postBatch.length,
        requiredCompleted,
        batchCompletionThreshold,
        processed: start,
        total: posts.length,
        postIds,
      });

      const batchHandle = await tasks.batchTrigger(
        "process-post",
        postBatch.map((post, index) => ({
          payload: {
            index: start + index,
            post,
          },
          options: {
            idempotencyKey: `process-stuck-processing-post:${post.id}`,
            idempotencyKeyTTL: "1h",
          },
        })),
      );

      let batchStatus: BatchRunStatus = {
        completed: 0,
        successful: 0,
        failed: 0,
        stillRunning: postBatch.length,
      };

      while (batchStatus.completed < requiredCompleted) {
        const currentBatch = await triggerBatch.retrieve(batchHandle.batchId);
        batchStatus = await getBatchRunStatus(
          currentBatch.runs,
          postBatch.length,
        );

        logger.info("Stuck processing posts batch progress", {
          batchNumber,
          totalBatches,
          batchId: batchHandle.batchId,
          requiredCompleted,
          ...batchStatus,
        });

        if (
          currentBatch.status === "COMPLETED" ||
          currentBatch.status === "PARTIAL_FAILED" ||
          currentBatch.status === "ABORTED"
        ) {
          break;
        }

        if (batchStatus.completed < requiredCompleted) {
          await wait.for({ seconds: pollIntervalSeconds });
        }
      }

      successful += batchStatus.successful;
      failed += batchStatus.failed;
      stillRunning += batchStatus.stillRunning;

      logger.info("Stuck processing posts batch complete", {
        batchNumber,
        totalBatches,
        batchId: batchHandle.batchId,
        batchSize: postBatch.length,
        requiredCompleted,
        ...batchStatus,
        processed: start + postBatch.length,
        total: posts.length,
      });
    }

    logger.info("Stuck processing posts backfill complete", {
      total: posts.length,
      processed: posts.length,
      successful,
      failed,
      stillRunning,
    });

    return {
      total: posts.length,
      processed: posts.length,
      successful,
      failed,
      stillRunning,
    };
  },
});
