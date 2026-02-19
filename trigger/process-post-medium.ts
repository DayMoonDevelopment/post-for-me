import { Database } from "@post-for-me/db";
import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";
import fetch from "node-fetch";
import * as fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { Upload } from "tus-js-client";
import { v4 as uuidv4 } from "uuid";

// Single Supabase client instance
const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Helper function to determine media type
const getMediaType = (
  contentType: string,
  fileExtension: string,
): "image" | "video" => {
  const imageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];
  const videoTypes = [
    "video/mp4",
    "video/webm",
    "video/mov",
    "video/avi",
    "video/quicktime",
  ];
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".qt"];

  const normalizedFileExtension = fileExtension.toLowerCase();

  if (imageTypes.includes(contentType)) {
    return "image";
  } else if (videoTypes.includes(contentType)) {
    return "video";
  } else if (imageExtensions.includes(normalizedFileExtension)) {
    return "image";
  } else if (videoExtensions.includes(normalizedFileExtension)) {
    return "video";
  }

  return "image"; // Default to image if uncertain
};

// Helper function to get file extension from URL or content type
const getFileExtension = (url: string, contentType?: string): string => {
  const urlExtension = path.extname(new URL(url).pathname);
  if (urlExtension) return urlExtension;

  if (contentType) {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/mov": ".mov",
      "video/avi": ".avi",
    };
    return mimeToExt[contentType] || ".bin";
  }

  return ".bin";
};

// Helper function to detect content type from file signature
const detectContentTypeFromBytes = (bytes: Uint8Array): string | null => {
  if (bytes.length < 12) return null;

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }

  // WebP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // MP4
  if (
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "video/mp4";
  }

  // WebM
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }

  // AVI
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x41 &&
    bytes[9] === 0x56 &&
    bytes[10] === 0x49 &&
    bytes[11] === 0x20
  ) {
    return "video/avi";
  }

  // MOV/QuickTime
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x71 &&
    bytes[9] === 0x74
  ) {
    return "video/quicktime";
  }

  return null;
};

// Helper function to stream download and upload file
const streamDownloadAndUpload = async (fileUrl: string, prefix: string) => {
  logger.info(`Streaming download from: ${fileUrl}`);

  // First, try a HEAD request to check content type without downloading
  let contentType: string | null = null;
  try {
    const headResponse = await fetch(fileUrl, { method: "HEAD" });
    if (!headResponse.ok) {
      throw new Error(`Head Response Not Valid: ${headResponse.statusText}`);
    }
    const headerContentType = headResponse.headers.get("content-type");
    logger.info(`Got content type from HEAD request: ${headerContentType}`);

    // If we have a valid image/video content type from headers, use it
    if (
      headerContentType &&
      (headerContentType.startsWith("image/") ||
        headerContentType.startsWith("video/"))
    ) {
      contentType = headerContentType;
      logger.info(
        "Using valid content type from headers, skipping byte detection",
        { contentType },
      );
    }
  } catch (error) {
    logger.info("HEAD request failed, will proceed with byte detection", {
      error,
    });
  }

  if (!contentType) {
    try {
      const partialResponse = await fetch(fileUrl, {
        headers: { Range: "bytes=0-511" },
      });

      if (!partialResponse.ok || partialResponse.status !== 206) {
        throw new Error(
          `Partial Response Not Valid: ${partialResponse.statusText}`,
        );
      }

      const partialBuffer = await partialResponse.arrayBuffer();
      const bytes = new Uint8Array(partialBuffer);
      const detectedContentType = detectContentTypeFromBytes(bytes);

      if (
        detectedContentType &&
        (detectedContentType.startsWith("image/") ||
          detectedContentType.startsWith("video/"))
      ) {
        contentType = detectedContentType;
        logger.info("Detected content type from file signature", {
          contentType,
        });
      }
    } catch (error) {
      logger.info("Range request failed", { error });
    }
  }

  // If we couldn't detect a media type, reject the file
  if (!contentType) {
    throw new Error("File type not supported");
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    logger.log("Failed to download", { response });
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("No response body available for streaming");
  }

  const fileExtension = getFileExtension(fileUrl, contentType);
  const fileName = `${prefix}_${uuidv4()}${fileExtension}`;
  const mediaType = getMediaType(contentType, fileExtension);

  logger.info(`Streaming upload to Supabase: ${fileName}`, {
    contentType,
    mediaType,
    contentLength: response.headers.get("content-length")
      ? `${response.headers.get("content-length")} bytes`
      : "unknown",
  });

  const bucketName = "post-media";

  // Stream download into a temp file so we never hold the whole file in memory.
  const tmpPath = path.join(os.tmpdir(), fileName);
  await pipeline(response.body as any, fs.createWriteStream(tmpPath));
  const stat = await fs.promises.stat(tmpPath);
  const uploadSize = stat.size;

  try {
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(fs.createReadStream(tmpPath) as any, {
      endpoint: `${process.env.SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadSize,
      headers: {
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
      metadata: {
        bucketName: "post-media",
        objectName: fileName,
        contentType: contentType,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
      onError: function (error) {
        logger.error("Failed uploading File", { error });
        reject(error);
      },
      onSuccess: function () {
        logger.info("File uploaded succesfully", { bucketName, fileName });
        resolve();
      },
      });

      // Check if there are any previous uploads to continue.
      return upload
        .findPreviousUploads()
        .catch(() => [])
        .then(function (previousUploads) {
          // Found previous uploads so we select the first one.
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }

          // Start the upload
          logger.info("Starting video upload", {
            bucketName,
            fileName,
            uploadSize,
          });
          upload.start();
        });
    });
  } finally {
    await fs.promises.unlink(tmpPath).catch(() => undefined);
  }

  logger.info(`File streamed and uploaded successfully: ${fileName}`);

  // Get public URL
  const { data: publicUrlData } = supabaseClient.storage
    .from("post-media")
    .getPublicUrl(fileName);

  return {
    publicUrl: publicUrlData.publicUrl,
    mediaType,
  };
};

export const processPostMedium = task({
  id: "process-post-medium",
  maxDuration: 800,
  retry: {
    maxAttempts: 3,
    outOfMemory: {
      machine: "large-1x",
    },
  },
  machine: "medium-2x",
  run: async ({
    medium: {
      url,
      thumbnail_url,
      provider,
      provider_connection_id,
      thumbnail_timestamp_ms,
      skip_processing,
    },
  }: {
    medium: {
      provider?: string | null;
      provider_connection_id?: string | null;
      url: string;
      thumbnail_url?: string | null;
      thumbnail_timestamp_ms?: number | null;
      skip_processing?: boolean | null;
    };
  }): Promise<{
    provider?: string | null;
    provider_connection_id?: string | null;
    url: string;
    thumbnail_url: string;
    thumbnail_timestamp_ms?: number | null;
    type: string;
    skip_processing?: boolean | null;
  }> => {
    logger.info("Starting media processing", { url, thumbnail_url });

    try {
      // Stream download and upload main media file
      let mediaResult: {
        publicUrl: string;
        mediaType: "image" | "video";
      } | null = null;
      let thumbnailResult: { publicUrl: string } | null = null;

      if (url) {
        mediaResult = await streamDownloadAndUpload(url, "media");
      }

      // Stream download and upload thumbnail if provided
      if (thumbnail_url) {
        thumbnailResult = await streamDownloadAndUpload(
          thumbnail_url,
          "thumbnail",
        );
      }

      if (!mediaResult) {
        throw new Error("No media URL provided");
      }

      const result = {
        url: mediaResult.publicUrl,
        thumbnail_url: thumbnailResult?.publicUrl || "",
        type: mediaResult.mediaType,
        provider: provider,
        provider_connection_id: provider_connection_id,
        thumbnail_timestamp_ms: thumbnail_timestamp_ms,
        skip_processing: skip_processing,
      };

      logger.info("Media processing completed successfully", result);

      return result;
    } catch (error) {
      logger.error("Error processing media", { error: error.message });
      throw error;
    }
  },
});
