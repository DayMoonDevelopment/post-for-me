import { task } from "@trigger.dev/sdk";
import { liveMediaExecutor } from "./live-media-runtime";
import { LIVE_MEDIA_MAX_DURATION_SECONDS } from "./live-media-timeout";
import { transformLiveImage } from "./live-media";
import type {
  StoredMedia,
  InstagramImageLimits,
  TikTokImageLimits,
} from "./media-recipes";
import { triggerImageTransform } from "./trigger-image-transform";
import {
  resolveMediaProcessingBackend,
  type MediaProcessingRouting,
} from "./media-processing-backend";

export type LiveImageInput = MediaProcessingRouting & {
  mediumId?: string;
  url: string;
  stored?: StoredMedia;
  platform: "instagram" | "tiktok" | "tiktok_business" | "twitter" | "bluesky";
  skipProcessing?: boolean;
  instagramLimits?: InstagramImageLimits;
  tiktokLimits?: TikTokImageLimits;
  options?: {
    firstImage?: {
      width: number | null | undefined;
      height: number | null | undefined;
    };
    placement?: string;
    is_feed?: boolean;
  };
};

export type LiveImageOutput = {
  url: string;
  signedUrl: string;
  mimeType: string;
  width: number | undefined;
  height: number | undefined;
  stored?: StoredMedia;
};

export const transformLiveImageTask = task({
  id: "transform-live-image",
  maxDuration: LIVE_MEDIA_MAX_DURATION_SECONDS,
  retry: { maxAttempts: 3 },
  run: async (
    {
      mediumId,
      url,
      stored,
      platform,
      skipProcessing,
      options,
      mediaProcessingBackend,
      instagramLimits,
      tiktokLimits,
      postId,
    }: LiveImageInput,
    { ctx },
  ): Promise<LiveImageOutput> => {
    const backend = resolveMediaProcessingBackend(
      mediumId || url,
      mediaProcessingBackend,
    );
    mediumId ||= "image";
    const legacyTransform = async (sourceUrl: string) => {
      const legacy = await triggerImageTransform({
        url: sourceUrl,
        platform,
        skipProcessing,
        options,
        instagramLimits,
        tiktokLimits,
        mediaProcessingBackend: "trigger",
      });
      if (!legacy.ok) {
        throw new Error(
          skipProcessing
            ? "Legacy image localization failed"
            : platform === "instagram"
              ? "Legacy Instagram transform failed"
              : platform === "tiktok" || platform === "tiktok_business"
                ? "Legacy TikTok transform failed"
                : "Legacy image transform failed",
        );
      }
      return legacy.output;
    };
    if (backend === "trigger")
      return { ...(await legacyTransform(url)), stored: undefined };
    const execute = liveMediaExecutor(ctx.run.id, postId);
    const source =
      stored ??
      (await execute("localize", mediumId, { task: "media.localize", url }));
    if (source.media.kind !== "image")
      throw new Error("Expected image metadata");
    const result = skipProcessing
      ? source
      : await transformLiveImage(
          source,
          mediumId,
          platform,
          {
            placement: options?.placement,
            isFeed: options?.is_feed,
            instagramLimits,
            tiktokLimits,
            firstImage:
              options?.firstImage?.width && options.firstImage.height
                ? {
                    width: options.firstImage.width,
                    height: options.firstImage.height,
                  }
                : undefined,
          },
          execute,
          async () => {
            const { url: legacyUrl } = await legacyTransform(source.url);
            if (!legacyUrl)
              throw new Error("Invalid legacy animated image output");
            // Re-localize the exception output so even subsequent callers get real stored references and metadata.
            return execute("localize-animated-output", mediumId, {
              task: "media.localize",
              url: legacyUrl,
            });
          },
        );
    if (result.media.kind !== "image")
      throw new Error("Invalid transformed image metadata");
    return {
      url: result.url,
      signedUrl: result.url,
      mimeType: result.contentType,
      width: result.media.width,
      height: result.media.height,
      stored: result,
    };
  },
});
