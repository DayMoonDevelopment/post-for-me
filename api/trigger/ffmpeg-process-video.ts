import { logger, task } from "@trigger.dev/sdk";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import os from "os";
import path from "path";
import fetch from "node-fetch";
import { createReadStream } from "fs";
import { Upload } from "tus-js-client";

// Constants
const DEFAULT_FRAME_RATE = 24;
const MIN_FRAME_RATE = 23;
const MAX_FRAME_RATE = 60;
const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;
const ASPECT_RATIOS = {
  VERTICAL: { ratio: 9 / 16, maxWidth: 1080, maxHeight: 1920 },
  LANDSCAPE: { ratio: 16 / 9, maxWidth: 1920, maxHeight: 1080 },
  SQUARE: { ratio: 1, maxWidth: 1080, maxHeight: 1080 },
  CLASSIC: { ratio: 4 / 3, maxWidth: 1440, maxHeight: 1080 },
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

// Optimized aspect ratio detection
const detectAspectRatio = (width: number, height: number) => {
  const ratio = width / height;
  const tolerance = 0.1;
  return (
    Object.values(ASPECT_RATIOS).find(
      (ar) => Math.abs(ratio - ar.ratio) <= tolerance
    ) || ASPECT_RATIOS.LANDSCAPE
  ); // Default to landscape if no match
};

const getFileKeyFromPublicUrl = (
  publicUrl: string,
  bucket: string
): string | null => {
  const pattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
  const match = publicUrl.match(pattern);
  return match ? match[1] : null;
};

export const ffmpegProcessVideo = task({
  id: "ffmpeg-process-video",
  maxDuration: 800,
  retry: {
    maxAttempts: 2,
    outOfMemory: {
      machine: "large-1x",
    },
  },
  machine: "medium-2x",
  run: async ({ medium: { url } }: { medium: { url: string } }) => {
    logger.info("Starting video processing", { url });
    const tempDir = os.tmpdir();
    const bucket = "post-media";
    const key = getFileKeyFromPublicUrl(url, bucket);

    if (!key) {
      logger.error("Unable to get key from url", { url });
      throw new Error("Unable to get key from url");
    }

    const filename = key.split("/").pop()!;
    const inputPath = path.join(tempDir, filename);
    const outputPath = path.join(tempDir, `out_${Date.now()}.mp4`);
    let fileProcessed = false;

    try {
      logger.info("Downloading video from signed URL");
      const videoResponse = await fetch(url);
      if (!videoResponse.body) throw new Error("Failed to fetch video");

      logger.info("Writing video to temporary file", { inputPath });
      const buffer = await videoResponse.arrayBuffer();
      const fileSizeBytes = buffer.byteLength;
      await fs.writeFile(inputPath, Buffer.from(buffer));

      logger.info("Probing video metadata");
      const metadata = await new Promise<any>((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const videoStream = metadata.streams.find(
        (s: any) => s.codec_type === "video"
      );
      const audioStream = metadata.streams.find(
        (s: any) => s.codec_type === "audio"
      );

      if (!videoStream) {
        throw new Error("No video stream found in file");
      }

      let { width, height } = videoStream;

      const rotation =
        videoStream.rotation ||
        videoStream.tags?.rotate ||
        videoStream.side_data_list?.find(
          (data: any) => data.side_data_type === "Display Matrix"
        )?.rotation;

      // If video is rotated 90° or 270°, swap dimensions
      if (
        rotation &&
        (Math.abs(rotation) === 90 || Math.abs(rotation) === 270)
      ) {
        logger.info("Video has rotation metadata, swapping dimensions", {
          originalDimensions: { width, height },
          rotation,
        });
        [width, height] = [height, width];
      }

      const frameCount = videoStream.nb_frames || 0;
      const { duration } = metadata.format;
      let frameRate = DEFAULT_FRAME_RATE;
      if (frameCount > 0 && frameCount !== "N/A") {
        frameRate = Math.round(parseInt(frameCount) / duration);
      } else if (
        videoStream.avg_frame_rate &&
        videoStream.avg_frame_rate !== "0/0"
      ) {
        const [num, den] = videoStream.avg_frame_rate.split("/").map(Number);
        if (den > 0 && num > 0) {
          frameRate = Math.round(num / den);
        }
      }
      const aspectRatio = detectAspectRatio(width, height);
      const hasAudio = !!audioStream;
      const videoCodec = videoStream.codec_name || "";

      // Get format extension and check if it's an MP4 file
      const formatExt = path.extname(filename).toLowerCase().substring(1);
      const isMP4 = metadata.format.format_name.includes("mp4");

      logger.info("Video metadata analysis", {
        width,
        height,
        frameRate,
        duration,
        hasAudio,
        videoCodec,
        format: metadata.format,
        audioChannels: audioStream ? audioStream.channels : 0,
        aspectRatio: `${aspectRatio.maxWidth}x${aspectRatio.maxHeight}`,
        formatExt,
        isMP4,
      });

      // Check audio - Threads strictly requires 128kbps AAC (enforced since Sept 5, 2025)
      const audioBitrate = audioStream?.bit_rate
        ? parseInt(audioStream.bit_rate)
        : 0;
      const hasValid128kAudio =
        audioBitrate >= 126000 && audioBitrate <= 130000; // Allow 126-130kbps
      // Check if the video meets Facebook audio requirements
      const hasValidAudio =
        !hasAudio ||
        (audioStream &&
          audioStream.codec_name === "aac" &&
          audioStream.channels <= 2 &&
          audioStream.sample_rate <= 48000 &&
          hasValid128kAudio); // AAC codec

      if (hasAudio && !hasValid128kAudio) {
        logger.info(
          `Audio bitrate must be 128kbps for Threads (got ${Math.round(audioBitrate / 1000)}kbps) - will reprocess`
        );
      }

      const isValidVideoCodec =
        videoCodec === "h264" || videoCodec === "hevc" || videoCodec === "h265";

      if (!isValidVideoCodec) {
        logger.info("Unsupported video codec detected, forcing processing", {
          currentCodec: videoCodec,
          supportedCodecs: ["h264", "hevc", "h265"],
        });
      }

      const needsProcessingForBitrate = metadata.format.bit_rate > 25000000;
      const needsProcessingForFileSize = fileSizeBytes > MAX_FILE_SIZE_BYTES;

      // Always process non-MP4 files
      if (!isMP4) {
        logger.info("Non-MP4 file detected - will process to MP4");
      }

      // Early exit conditions - Only MP4 files that meet all other requirements can skip processing
      if (
        isMP4 &&
        isValidVideoCodec &&
        !needsProcessingForBitrate &&
        !needsProcessingForFileSize &&
        frameRate >= MIN_FRAME_RATE &&
        frameRate <= MAX_FRAME_RATE &&
        width <= aspectRatio.maxWidth &&
        height <= aspectRatio.maxHeight &&
        hasValidAudio
      ) {
        logger.info("video already meets requirements, skipping processing");
        return;
      }

      if (needsProcessingForBitrate) {
        logger.info("Video bitrate exceeds 25Mbps, forcing processing.", {
          currentBitrate: metadata.format.bit_rate,
        });
      }

      logger.info("Video needs processing", {
        needsMP4Conversion: !isMP4,
        needsAudioProcessing: !hasValidAudio,
        format: metadata.format.format_name,
        triggeredByHighBitrate: needsProcessingForBitrate,
      });

      // Optimize scaling calculations
      const scaleRatio = Math.min(
        aspectRatio.maxWidth / width,
        aspectRatio.maxHeight / height,
        1 // Prevent upscaling
      );

      const targetWidth =
        scaleRatio < 1 ? Math.round((width * scaleRatio) / 2) * 2 : width;
      const targetHeight =
        scaleRatio < 1 ? Math.round((height * scaleRatio) / 2) * 2 : height;

      const fileSizeMB = fileSizeBytes / (1024 * 1024);
      const durationSeconds = metadata.format.duration;

      let videoEncodingOptions: string[];

      // Check if file size exceeds 300MB limit
      if (fileSizeMB > 300) {
        // Calculate target bitrate to achieve ~280MB file size (with safety margin)
        const targetSizeMB = 280;
        const targetSizeBytes = targetSizeMB * 1024 * 1024;
        const targetBitrate = Math.floor(
          (targetSizeBytes * 8) / durationSeconds
        );
        const targetBitrateMbps = Math.min(targetBitrate / 1000000, 15); // Cap at 15Mbps max

        logger.info(
          "File size exceeds 300MB, applying aggressive compression",
          {
            fileSizeMB,
            targetSizeMB,
            targetBitrateMbps,
            durationSeconds,
          }
        );

        videoEncodingOptions = [
          `-b:v ${targetBitrateMbps}M`,
          `-maxrate ${targetBitrateMbps * 1.1}M`,
          `-bufsize ${targetBitrateMbps * 2}M`,
        ];
      } else if (needsProcessingForBitrate) {
        // Original input bitrate > 25Mbps
        logger.info(
          "Input bitrate > 25Mbps (needsProcessingForBitrate=true), using target bitrate (-b:v 24M) for processing.",
          { inputBitrate: metadata.format.bit_rate }
        );
        videoEncodingOptions = ["-b:v 24M", "-maxrate 25M", "-bufsize 50M"];
      } else {
        // Input bitrate <= 25Mbps OR unknown. Use CRF. This path is also taken if processing for non-bitrate reasons (e.g. container change, other MP4 validation failures)
        logger.info(
          "Input bitrate <= 25Mbps or unknown (needsProcessingForBitrate=false), using CRF for processing.",
          { inputBitrate: metadata.format.bit_rate }
        );
        videoEncodingOptions = ["-crf 23", "-maxrate 25M", "-bufsize 50M"];
      }

      // Force frame rate to be TikTok-compatible
      const targetFrameRate =
        frameRate < MIN_FRAME_RATE || frameRate > MAX_FRAME_RATE
          ? DEFAULT_FRAME_RATE
          : frameRate;

      // Use faster preset for large files to reduce processing time
      const presetSpeed = fileSizeMB > 300 ? "superfast" : "ultrafast";

      const ffmpegOptions: string[] = [
        "-c:v libx264",
        `-preset ${presetSpeed}`,
        ...videoEncodingOptions, // Spread the chosen encoding options
        "-profile:v high",
        "-level 4.0",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        `-r ${targetFrameRate}`, // Always set frame rate explicitly
        `-vf scale=${targetWidth}:${targetHeight},fps=${targetFrameRate}`, // Always set fps filter
      ];

      // Audio settings
      if (hasAudio && audioStream) {
        ffmpegOptions.push("-c:a aac", "-b:a 128k", "-ac 2", "-ar 48000");
      } else {
        ffmpegOptions.push("-an"); // No audio
      }

      logger.info("Starting FFmpeg processing", {
        targetWidth,
        targetHeight,
        scaleRatio,
        ffmpegOptions,
      });

      // Optimized FFmpeg command
      const ffmpegCommand = ffmpeg(inputPath)
        .outputOptions(ffmpegOptions)
        .output(outputPath);

      await new Promise((resolve, reject) => {
        ffmpegCommand
          .on("end", () => {
            logger.info("FFmpeg processing completed");
            resolve(null);
          })
          .on("error", (err: any) => {
            logger.error("FFmpeg processing failed", { error: err });
            reject(err);
          })
          .run();
      });

      fileProcessed = true;

      logger.info("Uploading processed video to storage");
      await uploadFile({ bucketName: bucket, key, filePath: outputPath });

      logger.info("Video processing completed successfully", {
        key: key,
        bucket,
        processed: true,
      });
      return;
    } catch (e) {
      logger.error("Error processing video", { error: e });
      throw e;
    } finally {
      // Parallel cleanup
      logger.info("Cleaning up temporary files");
      await Promise.all(
        [
          fs
            .unlink(inputPath)
            .catch((e) => logger.error("Input cleanup failed", { error: e })),
          fileProcessed &&
            fs
              .unlink(outputPath)
              .catch((e) =>
                logger.error("Output cleanup failed", { error: e })
              ),
        ].filter(Boolean)
      );
    }
  },
});
