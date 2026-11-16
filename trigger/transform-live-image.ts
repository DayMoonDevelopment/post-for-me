import { task, tasks } from "@trigger.dev/sdk";
import { liveMediaExecutor } from "./live-media-runtime";
import { transformLiveImage } from "./live-media";
import type { StoredMedia, InstagramImageLimits, TikTokImageLimits } from "./media-recipes";
import type { transformInstagramImage } from "./transform-instagram-image";
import type { transformTikTokImage } from "./transform-tiktok-image";
import type { transformBufferedImage } from "./transform-buffered-image";
import { resolveMediaProcessingBackend, type MediaProcessingRouting } from "./media-processing-backend";

export type LiveImageInput = MediaProcessingRouting & {
  mediumId?: string;
  url: string;
  stored?: StoredMedia;
  platform: "instagram" | "tiktok" | "tiktok_business" | "twitter" | "bluesky";
  skipProcessing?: boolean;
  instagramLimits?: InstagramImageLimits;
  tiktokLimits?: TikTokImageLimits;
  options?: { firstImage?: { width: number | null | undefined; height: number | null | undefined }; placement?: string; is_feed?: boolean };
};

export const transformLiveImageTask = task({
  id: "transform-live-image",
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async ({ mediumId, url, stored, platform, skipProcessing, options, mediaProcessingBackend, instagramLimits, tiktokLimits }: LiveImageInput, { ctx }) => {
    const backend = resolveMediaProcessingBackend(mediumId || url, mediaProcessingBackend);
    mediumId ||= "image";
    const legacyTransform = async (sourceUrl: string) => {
      if (skipProcessing) {
        // Copy/profile without a transform; never guess the source MIME from its URL.
        const legacy = await tasks.triggerAndWait<typeof transformBufferedImage>("transform-buffered-image", {
          url: sourceUrl, platform: platform === "twitter" ? "twitter" : "bluesky",
          skipProcessing: true, mediaProcessingBackend: "trigger",
        });
        if (!legacy.ok) throw new Error("Legacy image localization failed");
        return { ...legacy.output, signedUrl: legacy.output.url };
      }
      if (platform === "instagram") {
        const legacy = await tasks.triggerAndWait<typeof transformInstagramImage>("transform-instagram-image", {
          signedUrl: sourceUrl, options, mediaProcessingBackend: "trigger",
          limits: instagramLimits ?? { minAspectRatio: 3 / 4, maxAspectRatio: 1.91, storiesMinAspectRatio: 9 / 16, reelsMinAspectRatio: 9 / 16, maxFileSize: 8 * 1024 * 1024 },
        });
        if (!legacy.ok || !legacy.output.signedUrl) throw new Error("Legacy Instagram transform failed");
        return { ...legacy.output, url: legacy.output.signedUrl, mimeType: "image/jpeg" };
      }
      if (platform === "tiktok" || platform === "tiktok_business") {
        const legacy = await tasks.triggerAndWait<typeof transformTikTokImage>("transform-tiktok-image", {
          signedUrl: sourceUrl, platform, mediaProcessingBackend: "trigger", maxFileSize: tiktokLimits?.maxFileSize ?? 20 * 1024 * 1024,
          allowedAspectRatios: tiktokLimits?.allowedAspectRatios ?? [{ ratio: 9 / 16, width: 1080, height: 1920 }, { ratio: 3 / 4, width: 1080, height: 1440 }, { ratio: 1, width: 1080, height: 1080 }, { ratio: 16 / 9, width: 1920, height: 1080 }],
        });
        if (!legacy.ok) throw new Error("Legacy TikTok transform failed");
        return { url: legacy.output, signedUrl: legacy.output, mimeType: "image/jpeg", width: undefined, height: undefined };
      }
      const legacy = await tasks.triggerAndWait<typeof transformBufferedImage>("transform-buffered-image", {
        url: sourceUrl, platform, skipProcessing, mediaProcessingBackend: "trigger",
      });
      if (!legacy.ok) throw new Error("Legacy image transform failed");
      return { ...legacy.output, signedUrl: legacy.output.url };
    };
    if (backend === "trigger") return { ...await legacyTransform(url), stored: undefined };
    const execute = liveMediaExecutor(ctx.run.id);
    const source = stored ?? await execute("localize", mediumId, { task: "media.localize", url });
    if (source.media.kind !== "image") throw new Error("Expected image metadata");
    const result = skipProcessing ? source : await transformLiveImage(source, mediumId, platform, {
      placement: options?.placement, isFeed: options?.is_feed,
      instagramLimits, tiktokLimits,
      firstImage: options?.firstImage?.width && options.firstImage.height
        ? { width: options.firstImage.width, height: options.firstImage.height } : undefined,
    }, execute, async () => {
      const { url: legacyUrl } = await legacyTransform(source.url);
      if (!legacyUrl) throw new Error("Invalid legacy animated image output");
      // Re-localize the exception output so even subsequent callers get real stored references and metadata.
      return execute("localize-animated-output", mediumId, { task: "media.localize", url: legacyUrl });
    });
    if (result.media.kind !== "image") throw new Error("Invalid transformed image metadata");
    return { url: result.url, signedUrl: result.url, mimeType: result.contentType,
      width: result.media.width, height: result.media.height, stored: result };
  },
});
