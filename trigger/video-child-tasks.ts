import { logger, task } from "@trigger.dev/sdk";
import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { uploadMedia } from "./media-storage";

async function downloadVideo(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Failed to download video: HTTP ${response.status}`);
  }
  if (!response.body) throw new Error("No response body available for streaming");
  await pipeline(
    Readable.fromWeb(response.body as unknown as ReadableStream<Uint8Array>),
    createWriteStream(filePath),
  );
}

export const generateYoutubeTimestampThumbnail = task({
  id: "generate-youtube-timestamp-thumbnail",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ url, timestampMs, mediaId }: {
    url: string;
    timestampMs: number;
    mediaId: string;
  }): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "youtube-thumbnail-"));
    const videoFilePath = path.join(tempDir, "video.mp4");
    const key = `youtube_thumb_${randomUUID()}.jpg`;
    const outputPath = path.join(tempDir, key);
    try {
      await downloadVideo(url, videoFilePath);
      logger.info("Extracting YouTube thumbnail frame", {
        mediaId, timestampMs, videoFilePath, outputPath,
      });
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoFilePath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .screenshots({
            timestamps: [timestampMs / 1000],
            filename: path.basename(outputPath),
            folder: path.dirname(outputPath),
          });
      });
      const { size } = await fs.stat(outputPath);
      logger.info("Extracted YouTube thumbnail frame", {
        mediaId, timestampMs, outputPath, sizeBytes: size,
      });
      return await uploadMedia({
        filePath: outputPath,
        key,
        contentType: "image/jpeg",
        cacheControl: "public, max-age=3600",
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  },
});

export const probeVideoDimensions = task({
  id: "probe-video-dimensions",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ url }: { url: string }): Promise<{
    width: number | undefined;
    height: number | undefined;
  }> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-probe-"));
    const inputPath = path.join(tempDir, "video.mp4");
    try {
      await downloadVideo(url, inputPath);
      const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      if (!videoStream) throw new Error("No video stream found in file");
      const { width, height } = videoStream;
      return { width, height };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  },
});
