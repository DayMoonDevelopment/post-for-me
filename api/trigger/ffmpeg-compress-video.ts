import { logger, task } from "@trigger.dev/sdk/v3";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createReadStream } from "fs";
import { Upload } from "tus-js-client";

const getFileKeyFromPublicUrl = (
  publicUrl: string,
  bucket: string
): string | null => {
  const pattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
  const match = publicUrl.match(pattern);
  return match ? match[1] : null;
};

async function uploadFile({
  bucketName,
  key,
  filePath,
}: {
  bucketName: string;
  key: string;
  filePath: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);

    const upload = new Upload(stream, {
      endpoint: `${process.env.SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
      metadata: {
        bucketName: bucketName,
        objectName: key,
        contentType: "video/mp4",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
      onError: function (error) {
        logger.error("Failed uploading video", { error });
        reject(error);
      },
      onSuccess: function () {
        logger.info("Video uploaded succesfully", { bucketName, key });
        resolve();
      },
    });

    // Check if there are any previous uploads to continue.
    return upload.findPreviousUploads().then(function (previousUploads) {
      // Found previous uploads so we select the first one.
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      // Start the upload
      logger.info("Starting video upload", { bucketName, key });
      upload.start();
    });
  });
}

export const ffmpegCompressVideo = task({
  id: "ffmpeg-compress-video",
  maxDuration: 800,
  retry: {
    maxAttempts: 2,
    outOfMemory: {
      machine: "large-1x",
    },
  },
  machine: "medium-2x",
  run: async ({
    url,
    maxSizeBytes,
  }: {
    url: string;
    maxSizeBytes: number;
  }): Promise<string> => {
    const bucket = "post-media";

    const key = getFileKeyFromPublicUrl(url, bucket);

    if (!key) {
      logger.error("Unable to get key from url", { url });
      throw new Error("Unable to get key from url");
    }

    const filename = key.split("/").pop()!;
    const processedKey = `${key}_blueskey`;

    logger.info("Downloading video from signed URL");
    const videoResponse = await fetch(url);
    if (!videoResponse.body) throw new Error("Failed to fetch video");

    const videoBuffer = await videoResponse.arrayBuffer();
    const fileSizeBytes = videoBuffer.byteLength;

    if (fileSizeBytes <= maxSizeBytes) {
      logger.info("file the right size, skipping process");
      return url;
    }

    const buffer = Buffer.from(videoBuffer);

    logger.info("Starting video compression for Bluesky", {
      inputSize: buffer.length,
      maxSizeBytes,
    });

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, filename);
    const maxAttempts = 3;
    let currentInputPath = inputPath;
    const outputPaths: string[] = [];

    try {
      // Write input buffer to file
      await fs.writeFile(inputPath, buffer);

      // Get video metadata to calculate compression strategy
      const metadata = await new Promise<any>((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const videoStream = metadata.streams.find(
        (s: any) => s.codec_type === "video"
      );

      if (!videoStream) {
        throw new Error("No video stream found in file");
      }

      const durationSeconds = metadata.format.duration;
      const audioStream = metadata.streams.find(
        (s: any) => s.codec_type === "audio"
      );

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const outputPath = path.join(
          tempDir,
          `processed_${Date.now()}_attempt_${attempt}.mp4`
        );
        outputPaths.push(outputPath);

        // Calculate target bitrate for this attempt
        // Use progressively more aggressive compression with each attempt
        const targetSizeRatio = 0.9 - (attempt - 1) * 0.1; // 0.9, 0.8, 0.7
        const targetSizeBytes = maxSizeBytes * targetSizeRatio;
        const targetBitrate = Math.floor(
          (targetSizeBytes * 8) / durationSeconds
        );
        const targetBitrateMbps = Math.max(targetBitrate / 1000000, 0.5); // Minimum 0.5Mbps for later attempts

        logger.info(
          `Compressing video for Bluesky (attempt ${attempt}/${maxAttempts})`,
          {
            originalSizeBytes: buffer.length,
            targetSizeBytes,
            targetBitrateMbps,
            durationSeconds,
            attempt,
          }
        );

        // FFmpeg options for compression with progressively more aggressive settings
        const ffmpegOptions = [
          "-c:v libx264",
          "-preset",
          attempt === 1 ? "fast" : attempt === 2 ? "medium" : "slow",
          `-b:v ${targetBitrateMbps}M`,
          `-maxrate ${targetBitrateMbps * 1.2}M`,
          `-bufsize ${targetBitrateMbps * 2}M`,
          "-profile:v",
          attempt === 1 ? "high" : "main",
          "-level 4.0",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ];

        // Handle audio compression with more aggressive settings for later attempts
        if (audioStream) {
          const audioBitrate =
            attempt === 1 ? "128k" : attempt === 2 ? "96k" : "64k";
          ffmpegOptions.push(
            "-c:a aac",
            `-b:a ${audioBitrate}`,
            "-ac 2",
            "-ar 48000"
          );
        } else {
          ffmpegOptions.push("-an"); // No audio
        }

        // Add additional compression for later attempts
        if (attempt > 1) {
          ffmpegOptions.push("-crf", attempt === 2 ? "28" : "32");
        }

        // Process video with FFmpeg
        await new Promise((resolve, reject) => {
          ffmpeg(currentInputPath)
            .outputOptions(ffmpegOptions)
            .output(outputPath)
            .on("end", () => {
              logger.info(`Video compression attempt ${attempt} completed`);
              resolve(null);
            })
            .on("error", (err: any) => {
              logger.error(`Video compression attempt ${attempt} failed`, {
                error: err,
              });
              reject(err);
            })
            .run();
        });

        // Read the processed video and check size
        const processedBuffer = await fs.readFile(outputPath);

        logger.info(`Video compression attempt ${attempt} results`, {
          originalSize: buffer.length,
          compressedSize: processedBuffer.length,
          compressionRatio: processedBuffer.length / buffer.length,
          targetSize: targetSizeBytes,
          withinLimit: processedBuffer.length <= maxSizeBytes,
        });

        // If the compressed video is within the size limit, return it
        if (processedBuffer.length <= maxSizeBytes) {
          logger.info(
            `Video successfully compressed within limit after ${attempt} attempt(s)`
          );

          logger.info("Uploading processed video to storage");
          await uploadFile({
            bucketName: bucket,
            key: processedKey,
            filePath: outputPath,
          });

          return url.replace(key, processedKey);
        }

        // If this isn't the last attempt, use the current output as input for the next attempt
        if (attempt < maxAttempts) {
          currentInputPath = outputPath;
          logger.info(
            `Attempt ${attempt} still too large (${processedBuffer.length} bytes), trying attempt ${attempt + 1} with more aggressive compression`
          );
        } else {
          // Last attempt - log final result and return anyway
          logger.warn(
            `Video still too large after ${maxAttempts} attempts, returning final result`,
            {
              finalSize: processedBuffer.length,
              maxSize: maxSizeBytes,
              exceedsBy: processedBuffer.length - maxSizeBytes,
            }
          );

          logger.info("Uploading processed video to storage");
          await uploadFile({
            bucketName: bucket,
            key: processedKey,
            filePath: outputPath,
          });
          return url.replace(key, processedKey);
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Unexpected end of compression attempts");
    } catch (error) {
      logger.error("Error compressing video", { error });
      throw error;
    } finally {
      // Clean up all temporary files
      const filesToClean = [inputPath, ...outputPaths];
      for (const filePath of filesToClean) {
        try {
          await fs.unlink(filePath);
        } catch (cleanupError) {
          logger.warn("Failed to clean up temporary file", {
            filePath,
            error: cleanupError,
          });
        }
      }
    }
  },
});
