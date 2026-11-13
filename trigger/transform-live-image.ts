import { task, tasks } from "@trigger.dev/sdk";
import { liveMediaExecutor } from "./live-media-runtime";
import { transformLiveImage } from "./live-media";
import type { StoredMedia } from "./media-recipes";
import type { transformInstagramImage } from "./transform-instagram-image";
import type { transformTikTokImage } from "./transform-tiktok-image";
import type { transformBufferedImage } from "./transform-buffered-image";

export type LiveImageInput = {
  mediumId?: string;
  url: string;
  stored?: StoredMedia;
  platform: "instagram" | "tiktok" | "tiktok_business" | "twitter" | "bluesky";
  skipProcessing?: boolean;
  options?: { firstImage?: { width: number | null | undefined; height: number | null | undefined }; placement?: string; is_feed?: boolean };
};

export const transformLiveImageTask = task({
  id: "transform-live-image",
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async ({ mediumId = "image", url, stored, platform, skipProcessing, options }: LiveImageInput, { ctx }) => {
    const execute = liveMediaExecutor(ctx.run.id);
    const source = stored ?? await execute("localize", mediumId, { task: "media.localize", url });
    if (source.media.kind !== "image") throw new Error("Expected image metadata");
    const result = skipProcessing ? source : await transformLiveImage(source, mediumId, platform, {
      placement: options?.placement, isFeed: options?.is_feed,
      firstImage: options?.firstImage?.width && options.firstImage.height
        ? { width: options.firstImage.width, height: options.firstImage.height } : undefined,
    }, execute, async () => {
      // Only Zenith's explicit unsupported-animation response reaches these legacy tasks.
      let legacyUrl: string | undefined;
      if (platform === "instagram") {
        const legacy = await tasks.triggerAndWait<typeof transformInstagramImage>("transform-instagram-image", {
          signedUrl: source.url, options,
          limits: { minAspectRatio: 3 / 4, maxAspectRatio: 1.91, storiesMinAspectRatio: 9 / 16, reelsMinAspectRatio: 9 / 16, maxFileSize: 8 * 1024 * 1024 },
        });
        if (!legacy.ok) throw new Error("Legacy animated Instagram transform failed");
        legacyUrl = legacy.output.signedUrl;
      } else if (platform === "tiktok" || platform === "tiktok_business") {
        const legacy = await tasks.triggerAndWait<typeof transformTikTokImage>("transform-tiktok-image", {
          signedUrl: source.url, platform, maxFileSize: 20 * 1024 * 1024,
          allowedAspectRatios: [{ ratio: 9 / 16, width: 1080, height: 1920 }, { ratio: 3 / 4, width: 1080, height: 1440 }, { ratio: 1, width: 1080, height: 1080 }, { ratio: 16 / 9, width: 1920, height: 1080 }],
        });
        if (!legacy.ok) throw new Error("Legacy animated TikTok transform failed");
        legacyUrl = legacy.output;
      } else {
        const legacy = await tasks.triggerAndWait<typeof transformBufferedImage>("transform-buffered-image", { url: source.url, platform });
        if (!legacy.ok) throw new Error("Legacy animated image transform failed");
        legacyUrl = legacy.output.url;
      }
      if (!legacyUrl) throw new Error("Invalid legacy animated image output");
      // Re-localize the exception output so even subsequent callers get real stored references and metadata.
      return execute("localize-animated-output", mediumId, { task: "media.localize", url: legacyUrl });
    });
    if (result.media.kind !== "image") throw new Error("Invalid transformed image metadata");
    return { url: result.url, signedUrl: result.url, mimeType: result.contentType,
      width: result.media.width, height: result.media.height, stored: result };
  },
});
