import { Database } from "./supabase.types";
import { createClient } from "@supabase/supabase-js";
import { logger, schedules, wait } from "@trigger.dev/sdk";
import {
  listR2ObjectsOlderThan,
  deleteR2Objects,
  getR2PublicUrl,
  abortAbandonedMultipartUploads,
} from "./lib/r2";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const storageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/post-media`;

export const supabaseMediaCleanup = schedules.task({
  cron: { pattern: "0 */1 * * *", environments: ["PRODUCTION"] },
  id: "supbase-media-cleanup",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  machine: "small-1x",
  run: async (payload) => {
    logger.info("Starting Media Cleanup", payload);

    // Get all files older than 1 day from storage
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const allOldFiles: any[] = [];
    let offset = 0;
    const limit = 1000; // Process in larger batches

    // Fetch all old files from storage
    for (;;) {
      const { data: files, error } = await supabaseClient.storage
        .from("post-media")
        .list(undefined, {
          limit,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });

      if (error) {
        logger.error("Error fetching files", { error });
        return;
      }

      if (!files?.length) break;

      // Filter files older than 1 day
      const oldFiles = files.filter(
        (file) =>
          file.created_at !== null &&
          new Date(file.created_at) < oneDayAgo &&
          file.metadata?.mimetype !== "text/plain",
      );

      if (oldFiles.length === 0) {
        //No files older than a day exiting loop
        break;
      }

      allOldFiles.push(...oldFiles);
      offset += limit;

      // If we got less than the limit, we've reached the end
      if (files.length < limit) break;
    }

    if (allOldFiles.length === 0) {
      logger.info("No old files found to potentially clean up");
      return;
    }

    logger.info(`Found ${allOldFiles.length} files older than 1 day`);

    logger.info("Fetching Scheduled Post Urls");
    const allScheduledPostUrls: string[] = [];
    let scheduledPostOffset = 0;
    const scheduledPostLimit = 1000;

    for (;;) {
      const { data: scheduledPostUrls, error: scheduledPostError } =
        await supabaseClient
          .from("social_post_media")
          .select("*, social_posts!inner(id, status)")
          .eq("social_posts.status", "scheduled")
          .like("url", `%${storageUrl}%`)
          .range(
            scheduledPostOffset,
            scheduledPostOffset + scheduledPostLimit - 1,
          );

      if (scheduledPostError) {
        logger.error("Error fetching scheduled posts", {
          error: scheduledPostError,
        });
        return;
      }

      if (!scheduledPostUrls || scheduledPostUrls.length === 0) break;

      allScheduledPostUrls.push(...scheduledPostUrls.map((media) => media.url));
      scheduledPostOffset += scheduledPostLimit;

      if (scheduledPostUrls.length < scheduledPostLimit) break;
    }

    logger.info("Completed fetching scheduled post urls", {
      scheduledPostUrls: allScheduledPostUrls.length,
    });

    logger.info("Calculating files to delete");
    const filesToDelete = allOldFiles.filter((file) => {
      return !allScheduledPostUrls.find((url) => url.includes(file.name));
    });

    logger.info("Files to delete", { filesToDelete: filesToDelete.length });

    // Delete files in batches to avoid overwhelming the storage API
    const batchSize = 50;
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);

      const { error: deleteError } = await supabaseClient.storage
        .from("post-media")
        .remove(batch.map((file) => file.name));

      if (deleteError) {
        logger.error(`Error deleting batch ${i / batchSize + 1}`, {
          error: deleteError,
          batch,
        });
        errorCount += batch.length;
      } else {
        logger.info(`Successfully deleted batch ${i / batchSize + 1}`, {
          filesDeleted: batch.length,
        });
        deletedCount += batch.length;
      }

      // Add a small delay between batches to be nice to the API
      if (i + batchSize < filesToDelete.length) {
        await wait.for({ seconds: 0.1 });
      }
    }

    logger.info("Media cleanup completed", {
      totalOldFiles: allOldFiles.length,
      totalReferencedUrls: allScheduledPostUrls.length,
      filesToDelete: filesToDelete.length,
      successfullyDeleted: deletedCount,
      errors: errorCount,
    });

    // R2 cleanup
    logger.info("Starting R2 Media Cleanup");

    const oldR2Objects = await listR2ObjectsOlderThan(oneDayAgo);

    if (oldR2Objects.length === 0) {
      logger.info("No old R2 objects found to potentially clean up");
      return;
    }

    logger.info(`Found ${oldR2Objects.length} R2 objects older than 1 day`);

    const r2PublicUrl = process.env.R2_PUBLIC_URL!;
    const allScheduledR2Urls: string[] = [];
    let r2PostOffset = 0;

    for (;;) {
      const { data: r2PostUrls, error: r2PostError } = await supabaseClient
        .from("social_post_media")
        .select("*, social_posts!inner(id, status)")
        .eq("social_posts.status", "scheduled")
        .like("url", `%${r2PublicUrl}%`)
        .range(r2PostOffset, r2PostOffset + 999);

      if (r2PostError) {
        logger.error("Error fetching scheduled R2 post urls", {
          error: r2PostError,
        });
        break;
      }

      if (!r2PostUrls || r2PostUrls.length === 0) break;

      allScheduledR2Urls.push(...r2PostUrls.map((media) => media.url));
      r2PostOffset += 1000;

      if (r2PostUrls.length < 1000) break;
    }

    const scheduledR2UrlSet = new Set(allScheduledR2Urls);
    const r2KeysToDelete = oldR2Objects
      .filter((obj) => !scheduledR2UrlSet.has(getR2PublicUrl(obj.key)))
      .map((obj) => obj.key);

    logger.info("R2 objects to delete", { count: r2KeysToDelete.length });

    if (r2KeysToDelete.length > 0) {
      await deleteR2Objects(r2KeysToDelete);
    }

    logger.info("R2 media cleanup completed", {
      totalOldObjects: oldR2Objects.length,
      scheduledUrls: allScheduledR2Urls.length,
      deleted: r2KeysToDelete.length,
    });

    // Abort any multipart uploads that were left incomplete (e.g. ffmpeg jobs
    // that failed mid-upload). These accumulate and count against storage.
    logger.info("Aborting abandoned R2 multipart uploads");
    const { aborted } = await abortAbandonedMultipartUploads(oneDayAgo);
    logger.info("Abandoned multipart upload cleanup completed", { aborted });
  },
});
