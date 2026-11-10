import { task } from "@trigger.dev/sdk";
import { randomUUID } from "crypto";
import axios from "axios";
import sharp from "sharp";
import { uploadMedia } from "./media-storage";
import { compressJpegToLimit } from "./posting/image-processing-utils";

export const transformTikTokImage = task({
  id: "transform-tiktok-image",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ signedUrl, platform, maxFileSize, allowedAspectRatios }: {
    signedUrl: string;
    platform: "tiktok" | "tiktok_business";
    maxFileSize: number;
    allowedAspectRatios: { ratio: number; width: number; height: number }[];
  }): Promise<string> => {
    const response = await axios({
      url: signedUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(response.data);

    // Get image metadata and choose nearest TikTok-allowed ratio
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) {
      throw new Error("Unable to read image dimensions for TikTok upload");
    }

    const orientation = metadata.orientation || 1;
    const isExifRotated = [5, 6, 7, 8].includes(orientation);
    const displayedWidth = isExifRotated ? height : width;
    const displayedHeight = isExifRotated ? width : height;

    const aspectRatio = displayedWidth / displayedHeight;
    const targetRatio = allowedAspectRatios.reduce((closest, current) =>
      Math.abs(current.ratio - aspectRatio) <
      Math.abs(closest.ratio - aspectRatio)
        ? current
        : closest,
    );

    // Process image with Sharp (normalize orientation, crop, resize and compress)
    let processedImage = await sharp(imageBuffer)
      .rotate()
      .resize({
        width: targetRatio.width,
        height: targetRatio.height,
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 100 })
      .toBuffer();

    processedImage = await compressJpegToLimit(processedImage, maxFileSize);

    return await uploadMedia({
      key: `${platform}_${randomUUID()}.jpg`,
      body: processedImage,
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000",
    });
  },
});
