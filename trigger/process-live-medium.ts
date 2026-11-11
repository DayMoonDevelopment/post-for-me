import { logger, task } from "@trigger.dev/sdk";
import type { ProcessedMedium } from "./process-post";
import { liveMediaExecutor } from "./live-media-runtime";
import { normalizeLiveVideo } from "./live-media";

export const processLiveMedium = task({
  id: "process-live-medium",
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async ({ medium }: { medium: Omit<ProcessedMedium, "type" | "thumbnail_url"> & { thumbnail_url?: string | null } }, { ctx }): Promise<ProcessedMedium> => {
    const execute = liveMediaExecutor(ctx.run.id);
    let stored = await execute("localize", medium.id, { task: "media.localize", url: medium.url });
    let thumbnail;
    if (medium.thumbnail_url) {
      try {
        thumbnail = await execute("localize-thumbnail", medium.id, { task: "media.localize", url: medium.thumbnail_url });
      } catch {
        // A supplied thumbnail is optional; retain the original URL on failure.
        logger.warn("Optional thumbnail localization failed", { mediumId: medium.id });
      }
    }
    if (stored.media.kind === "video" && !medium.skip_processing) {
      stored = await normalizeLiveVideo(stored, medium.id, execute);
    }
    return {
      ...medium, url: stored.url, type: stored.media.kind, stored,
      thumbnail_url: thumbnail?.url || medium.thumbnail_url || "", thumbnail_stored: thumbnail,
    };
  },
});
