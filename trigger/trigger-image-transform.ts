import { tasks } from "@trigger.dev/sdk";
import { resolveMediaProcessingBackend } from "./media-processing-backend";
import type { LiveImageInput, transformLiveImageTask } from "./transform-live-image";
import type { transformBufferedImage } from "./transform-buffered-image";
import type { transformInstagramImage } from "./transform-instagram-image";
import type { transformTikTokImage } from "./transform-tiktok-image";

/** Choose the task before dispatch so legacy images don't need a routing task. */
export async function triggerImageTransform(input: LiveImageInput) {
  const backend = resolveMediaProcessingBackend(input.mediumId || input.url, input.mediaProcessingBackend);
  if (backend === "zenith") {
    return tasks.triggerAndWait<typeof transformLiveImageTask>("transform-live-image", {
      ...input, mediaProcessingBackend: backend,
    });
  }

  if (!input.skipProcessing && input.platform === "instagram") {
    const result = await tasks.triggerAndWait<typeof transformInstagramImage>("transform-instagram-image", {
      signedUrl: input.url, options: input.options, mediaProcessingBackend: backend,
      limits: input.instagramLimits ?? {
        minAspectRatio: 3 / 4, maxAspectRatio: 1.91, storiesMinAspectRatio: 9 / 16,
        reelsMinAspectRatio: 9 / 16, maxFileSize: 8 * 1024 * 1024,
      },
    });
    if (!result.ok) return result;
    if (!result.output.signedUrl) throw new Error("Legacy Instagram transform failed");
    return { ...result, output: {
      ...result.output, url: result.output.signedUrl, signedUrl: result.output.signedUrl,
      mimeType: "image/jpeg", stored: undefined,
    } };
  }

  if (!input.skipProcessing && (input.platform === "tiktok" || input.platform === "tiktok_business")) {
    const result = await tasks.triggerAndWait<typeof transformTikTokImage>("transform-tiktok-image", {
      signedUrl: input.url, platform: input.platform, mediaProcessingBackend: backend,
      maxFileSize: input.tiktokLimits?.maxFileSize ?? 20 * 1024 * 1024,
      allowedAspectRatios: input.tiktokLimits?.allowedAspectRatios ?? [
        { ratio: 9 / 16, width: 1080, height: 1920 }, { ratio: 3 / 4, width: 1080, height: 1440 },
        { ratio: 1, width: 1080, height: 1080 }, { ratio: 16 / 9, width: 1920, height: 1080 },
      ],
    });
    if (!result.ok) return result;
    return { ...result, output: {
      url: result.output, signedUrl: result.output, mimeType: "image/jpeg",
      width: undefined, height: undefined, stored: undefined,
    } };
  }

  const result = await tasks.triggerAndWait<typeof transformBufferedImage>("transform-buffered-image", {
    url: input.url, platform: input.platform === "twitter" ? "twitter" : "bluesky",
    skipProcessing: input.skipProcessing, mediaProcessingBackend: backend,
  });
  if (!result.ok) return result;
  return { ...result, output: { ...result.output, signedUrl: result.output.url, stored: undefined } };
}
