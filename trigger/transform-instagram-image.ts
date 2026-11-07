import { task } from "@trigger.dev/sdk";
import { randomUUID } from "crypto";
import axios from "axios";
import sharp from "sharp";
import { uploadMedia } from "./media-storage";
import { enqueueMediaServerJob } from "./media-server";
import {
  compressJpegToLimit,
  computeCropDimensions,
  resolveInstagramMinAspectRatio,
} from "./posting/image-processing-utils";

export const transformInstagramImage = task({
  id: "transform-instagram-image",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ signedUrl, options, limits }: {
    signedUrl: string;
    options?: {
      firstImage?: {
        width: number | null | undefined;
        height: number | null | undefined;
      };
      placement?: string;
      is_feed?: boolean;
    };
    limits: {
      minAspectRatio: number;
      maxAspectRatio: number;
      storiesMinAspectRatio: number;
      reelsMinAspectRatio: number;
      maxFileSize: number;
    };
  }): Promise<{
    signedUrl: string | undefined;
    width: number | undefined;
    height: number | undefined;
  }> => {
    const response = await axios({
      url: signedUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(response.data);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const aspectRatio = width / height;
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;

    const minAspectRatio = resolveInstagramMinAspectRatio({
      placement: options?.placement,
      isFeed: options?.is_feed,
      feedMinAspectRatio: limits.minAspectRatio,
      storiesMinAspectRatio: limits.storiesMinAspectRatio,
      reelsMinAspectRatio: limits.reelsMinAspectRatio,
    });

    if (options?.firstImage?.width && options?.firstImage?.height) {
      const firstImageRatio =
        options?.firstImage?.width / options?.firstImage?.height;

      if (firstImageRatio !== aspectRatio) {
        targetWidth = options?.firstImage?.width;
        targetHeight = options?.firstImage?.height;
      }
    } else {
      ({ width: targetWidth, height: targetHeight } = computeCropDimensions({
        width,
        height,
        minAspectRatio,
        maxAspectRatio: limits.maxAspectRatio,
      }));
    }

    // Process image with Sharp (resize & compress)
    let processedImage = await sharp(imageBuffer)
      .rotate()
      .resize({ width: targetWidth, height: targetHeight })
      .jpeg({ quality: 100 })
      .toBuffer();

    // Ensure size is within Instagram limits
    let shadowQuality = 100;
    processedImage = await compressJpegToLimit(processedImage, limits.maxFileSize, (quality) => { shadowQuality = quality; });

    await enqueueMediaServerJob("transform-instagram-image", {
      task: "media.transform-image",
      source: signedUrl,
      output: {
        type: "image",
        format: "jpeg",
        quality: shadowQuality,
        autoOrient: true,
        resize: { width: targetWidth, height: targetHeight, fit: "cover", withoutEnlargement: false },
      },
      maxBytes: limits.maxFileSize,
    });

    const publicUrl = await uploadMedia({
      key: `instagram_${randomUUID()}.jpg`,
      body: processedImage,
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000",
    });

    return {
      signedUrl: publicUrl,
      width: targetWidth,
      height: targetHeight,
    };
  },
});
