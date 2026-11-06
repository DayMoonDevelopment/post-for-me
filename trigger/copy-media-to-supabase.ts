import { task } from "@trigger.dev/sdk";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished, pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { Upload } from "tus-js-client";

export const copyMediaToSupabase = task({
  id: "copy-media-to-supabase",
  machine: "medium-1x",
  maxDuration: 800,
  retry: { maxAttempts: 3 },
  run: async ({ url }: { url: string }): Promise<string> => {
    const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }

    const response = await fetch(url);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Failed to download media: HTTP ${response.status}`);
    }
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0].trim().toLowerCase();
    if (!/^(image|video)\/[^\s/]+$/.test(contentType)) {
      await response.body?.cancel();
      throw new Error("Only image and video media are supported");
    }
    if (!response.body) throw new Error("No response body available for streaming");

    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "image/avif": ".avif",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/mov": ".mov",
      "video/quicktime": ".mov",
      "video/avi": ".avi",
    };
    const extension = extensions[contentType] ?? "";
    const key = `tiktok_${randomUUID()}${extension}`;
    const tempPath = path.join(os.tmpdir(), key);

    try {
      await pipeline(
        Readable.fromWeb(response.body as unknown as ReadableStream<Uint8Array>),
        createWriteStream(tempPath, { flags: "wx" }),
      );
      const { size } = await stat(tempPath);
      const input = createReadStream(tempPath);
      try {
        await new Promise<void>((resolve, reject) => {
          // TUS errors may include request headers containing the service-role key.
          const fail = () => reject(new Error("Failed to upload media to Supabase"));
          input.on("error", fail);
          const upload = new Upload(input, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            headers: { authorization: `Bearer ${serviceRoleKey}` },
            uploadSize: size,
            chunkSize: 6 * 1024 * 1024,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
              bucketName: "post-media",
              objectName: key,
              contentType,
              cacheControl: "3600",
            },
            onError: fail,
            onSuccess: () => resolve(),
          });
          upload.start();
        });
      } catch {
        throw new Error("Failed to upload media to Supabase");
      } finally {
        input.destroy();
        await finished(input).catch(() => undefined);
      }
      const publicBase = process.env.SUPABASE_MEDIA_PUBLIC_BASE_URL?.trim()
        || `${supabaseUrl}/storage/v1/object/public/post-media`;
      return `${publicBase.replace(/\/+$/, "")}/${encodeURIComponent(key)}`;
    } finally {
      await rm(tempPath, { force: true });
    }
  },
});
