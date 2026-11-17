import { logger, task, tasks } from "@trigger.dev/sdk";
import type { ProcessedMedium } from "./process-post";
import { liveMediaExecutor } from "./live-media-runtime";
import { LIVE_MEDIA_MAX_DURATION_SECONDS } from "./live-media-timeout";
import { normalizeLiveVideo, type PendingLiveMediaJob } from "./live-media";
import { resolveMediaProcessingBackend } from "./media-processing-backend";
import type { processPostMedium } from "./process-post-medium";
import type { ffmpegProcessVideo } from "./ffmpeg-process-video";

export const processLiveMedium = task({
  id: "process-live-medium",
  maxDuration: LIVE_MEDIA_MAX_DURATION_SECONDS,
  retry: { maxAttempts: 1 },
  run: async ({ medium }: { medium: Omit<ProcessedMedium, "type" | "thumbnail_url"> & { thumbnail_url?: string | null } }, { ctx }): Promise<ProcessedMedium> => {
    const mediaProcessingBackend = resolveMediaProcessingBackend(medium.id || medium.url, medium.mediaProcessingBackend);
    if (mediaProcessingBackend === "trigger") {
      const localized = await tasks.triggerAndWait<typeof processPostMedium>("process-post-medium", {
        medium: { ...medium, mediaProcessingBackend },
      });
      if (!localized.ok) throw new Error("Legacy media localization failed", { cause: localized.error });
      if (localized.output.type !== "video" || medium.skip_processing) return { ...localized.output, mediaProcessingBackend };
      const normalized = await tasks.triggerAndWait<typeof ffmpegProcessVideo>("ffmpeg-process-video", {
        medium: { ...localized.output, mediaProcessingBackend },
      });
      if (!normalized.ok) throw new Error("Legacy video normalization failed", { cause: normalized.error });
      return { ...normalized.output, mediaProcessingBackend };
    }
    const execute = liveMediaExecutor(ctx.run.id, medium.postId);
    const mediaJob = await execute.submit("localize", medium.id, { task: "media.localize", url: medium.url });
    let thumbnailJob: PendingLiveMediaJob | undefined;
    if (medium.thumbnail_url) {
      try {
        thumbnailJob = await execute.submit("localize-thumbnail", medium.id, { task: "media.localize", url: medium.thumbnail_url });
      } catch {
        logger.warn("Optional thumbnail localization failed", { mediumId: medium.id });
      }
    }
    let stored = await mediaJob.wait();
    let thumbnail;
    if (thumbnailJob) {
      try {
        thumbnail = await thumbnailJob.wait();
      } catch {
        // A supplied thumbnail is optional; retain the original URL on failure.
        logger.warn("Optional thumbnail localization failed", { mediumId: medium.id });
      }
    }
    if (stored.media.kind === "video" && !medium.skip_processing) {
      stored = await normalizeLiveVideo(stored, medium.id, execute);
    }
    return {
      ...medium, mediaProcessingBackend, url: stored.url, type: stored.media.kind, stored,
      thumbnail_url: thumbnail?.url || medium.thumbnail_url || "", thumbnail_stored: thumbnail,
    };
  },
});
