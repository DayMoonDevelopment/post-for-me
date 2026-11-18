import { task } from "@trigger.dev/sdk";
import { liveMediaExecutor } from "./live-media-runtime";
import { LIVE_MEDIA_MAX_DURATION_SECONDS } from "./live-media-timeout";
import { extractYoutubeThumbnailFrame } from "./live-media";
import type { StoredMedia } from "./media-recipes";

export type ExtractLiveVideoFrameInput = {
  postId?: string;
  mediumId: string;
  stored: StoredMedia;
  atMs: number;
};

/** Runs in its own run so its token wait never overlaps the YouTube client's other waits. */
export const extractLiveVideoFrameTask = task({
  id: "extract-live-video-frame",
  maxDuration: LIVE_MEDIA_MAX_DURATION_SECONDS,
  retry: { maxAttempts: 1 },
  run: async ({ postId, mediumId, stored, atMs }: ExtractLiveVideoFrameInput, { ctx }): Promise<{ url: string }> => {
    const frame = await extractYoutubeThumbnailFrame(stored, mediumId, atMs, liveMediaExecutor(ctx.run.id, postId));
    return { url: frame.url };
  },
});
