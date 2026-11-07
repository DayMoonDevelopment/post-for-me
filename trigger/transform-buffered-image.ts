import { task } from "@trigger.dev/sdk";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { uploadMedia } from "./media-storage";
import { enqueueMediaServerJob } from "./media-server";
import { compressJpegToLimit } from "./posting/image-processing-utils";

export const transformBufferedImage = task({
  id: "transform-buffered-image",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ url, platform, skipProcessing }: {
    url: string;
    platform: "bluesky" | "twitter";
    skipProcessing?: boolean;
  }): Promise<{
    url: string;
    mimeType: string;
    width: number | undefined;
    height: number | undefined;
  }> => {
    const response = await fetch(url);
    const file = await response.blob();
    const buffer = Buffer.from(await file.arrayBuffer());
    let processedImage: Buffer = buffer;
    let mimeType = file.type;
    let width: number | undefined;
    let height: number | undefined;
    let shadowQuality: number | undefined;
    let shadowResize = false;

    if (platform === "twitter") {
      // Twitter uploads retain the source MIME even when compression emits JPEG.
      if (!skipProcessing) {
        processedImage = await compressJpegToLimit(buffer, 5 * 1024 * 1024, (quality) => { shadowQuality = quality; });
      }
    } else {
      // Bluesky embeds use the original dimensions, including when processing is skipped.
      ({ width, height } = await sharp(buffer).metadata());
      mimeType = file.type || "image/jpeg";
      if (!skipProcessing) {
        processedImage = await sharp(buffer).toBuffer();
        const maxFileSize = 976.56 * 1024;
        if (buffer.length > maxFileSize) {
          shadowResize = true;
          shadowQuality = 80;
          processedImage = await sharp(processedImage)
            .rotate()
            .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          mimeType = "image/jpeg";
          console.log(`Resized to ${processedImage.length} bytes`);
          if (processedImage.length > maxFileSize) {
            shadowQuality = 60;
            processedImage = await sharp(processedImage)
              .jpeg({ quality: 60 })
              .toBuffer();
            console.log(`Further compressed to ${processedImage.length} bytes`);
          }
        }
      }
    }

    // Copy paths retain supported source formats. GIF and other formats use a representative JPEG.
    const shadowFormat = shadowQuality !== undefined ? "jpeg"
      : file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp" : "jpeg";
    await enqueueMediaServerJob("transform-buffered-image", {
      task: "media.transform-image",
      source: url,
      output: {
        type: "image",
        format: shadowFormat,
        quality: shadowQuality,
        autoOrient: shadowResize,
        ...(shadowResize ? { resize: {
          width: 2000, height: 2000, fit: "inside" as const, withoutEnlargement: true,
        } } : {}),
      },
      ...(!skipProcessing ? { maxBytes: platform === "twitter" ? 5 * 1024 * 1024 : Math.floor(976.56 * 1024) } : {}),
    });

    const artifactUrl = await uploadMedia({
      key: `${platform}_${randomUUID()}`,
      body: processedImage,
      contentType: mimeType,
      cacheControl: "public, max-age=31536000",
    });
    return { url: artifactUrl, mimeType, width, height };
  },
});
