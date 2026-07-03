import { Database } from "./supabase.types";
import { createClient } from "@supabase/supabase-js";
import { logger, schedules, wait } from "@trigger.dev/sdk";
import { createStorageProvider } from "./storage/r2-storage.provider";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const storageProvider = createStorageProvider();

const storageUrl = process.env.R2_PUBLIC_URL!;

export const cloudflareMediaCleanup = schedules.task({
  cron: { pattern: "0 */1 * * *", environments: ["PRODUCTION"] },
  id: "cloudflare-media-cleanup",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  machine: "small-1x",
  run: async (payload) => {
    logger.info("Starting Cloudflare Media Cleanup", payload);

    // Get all files older than 1 day from storage
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const allOldFiles: Awaited<ReturnType<typeof storageProvider.list>> = [];

    try {
      for await (const file of storageProvider.listAll("post-media")) {
        if (
          file.createdAt != null &&
          new Date(file.createdAt) < oneDayAgo
        ) {
          allOldFiles.push(file);
        }
      }
    } catch (error) {
      logger.error("Error fetching files", { error });
      return;
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

      try {
        await storageProvider.remove("post-media", batch.map((file) => file.name));
        logger.info(`Successfully deleted batch ${i / batchSize + 1}`, {
          filesDeleted: batch.length,
        });
        deletedCount += batch.length;
      } catch (deleteError) {
        logger.error(`Error deleting batch ${i / batchSize + 1}`, {
          error: deleteError,
          batch,
        });
        errorCount += batch.length;
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
  },
});
