/**
 * Pure helpers extracted from the platform clients' image transform methods
 * so the aspect-ratio clamping and skip_processing gating can be unit tested
 * without driving a full `post()` call (which requires mocking each
 * platform's entire API request sequence).
 */

import sharp from "sharp";

export function shouldSkipProcessing(medium: {
  skip_processing?: boolean | null;
}): boolean {
  return !!medium.skip_processing;
}

/**
 * Crops toward `minAspectRatio`/`maxAspectRatio` by shrinking the offending
 * dimension, mirroring Instagram's #transformImage behavior. Returns the
 * input dimensions unchanged when already within bounds.
 */
export function computeCropDimensions({
  width,
  height,
  minAspectRatio,
  maxAspectRatio,
}: {
  width: number;
  height: number;
  minAspectRatio: number;
  maxAspectRatio: number;
}): { width: number; height: number } {
  const aspectRatio = width / height;

  if (aspectRatio > maxAspectRatio) {
    // Too wide → crop width to fit the max ratio.
    return { width: Math.round(height * maxAspectRatio), height };
  }

  if (aspectRatio < minAspectRatio) {
    // Too tall → crop height to fit the min ratio.
    return { width, height: Math.round(width / minAspectRatio) };
  }

  return { width, height };
}

/**
 * Selects which of Instagram's three floors (stories / reels / feed) applies
 * to a given image, matching the ternary in #transformImage.
 */
export function resolveInstagramMinAspectRatio({
  placement,
  isFeed,
  feedMinAspectRatio,
  storiesMinAspectRatio,
  reelsMinAspectRatio,
}: {
  placement?: string;
  isFeed?: boolean;
  feedMinAspectRatio: number;
  storiesMinAspectRatio: number;
  reelsMinAspectRatio: number;
}): number {
  if (placement === "stories") {
    return storiesMinAspectRatio;
  }

  if (!isFeed) {
    return reelsMinAspectRatio;
  }

  return feedMinAspectRatio;
}

/**
 * Progressively re-encodes a JPEG buffer at quality 80, then quality 60 if
 * still too large, mirroring the compression ladder shared by the platform
 * clients' image transform methods. Returns the input unchanged if it
 * already fits within maxFileSize.
 */
export async function compressJpegToLimit(
  buffer: Buffer,
  maxFileSize: number,
): Promise<Buffer> {
  if (buffer.length <= maxFileSize) {
    return buffer;
  }

  let compressed = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

  if (compressed.length > maxFileSize) {
    compressed = await sharp(compressed).jpeg({ quality: 60 }).toBuffer();
  }

  return compressed;
}
