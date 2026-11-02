import type { ApiClient } from "~/lib/.server/api/client";

import { AppException } from "~/lib/.server/errors";

/** `POST /v1/media/create-upload-url` — a signed PUT target + the eventual public URL. */
interface ApiCreateUploadUrl {
  media_url: string;
  upload_url: string;
}

export interface MediaService {
  /**
   * Two-step media upload: mint a signed URL, then PUT the file bytes to it. Returns the
   * public `media_url` to reference in `socialPosts.create({ media: [{ url }] })`. Unused
   * uploads auto-expire after 24h.
   */
  upload(file: File): Promise<string>;
}

/**
 * Media upload, bound to a project via the request-scoped {@link ApiClient}. The
 * create-upload-url call is JSON (through the client); the actual bytes go by a raw `PUT`
 * to the signed storage URL (no auth, the file's own content-type), so it bypasses the
 * client's JSON envelope.
 */
export function createApiMediaService(client: ApiClient): MediaService {
  return {
    async upload(file: File): Promise<string> {
      const { upload_url, media_url } = await client.post<ApiCreateUploadUrl>(
        "/v1/media/create-upload-url",
        { name: file.name, mime_type: file.type, size_bytes: file.size },
      );

      const contentType = file.type || "application/octet-stream";
      const response = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!response.ok) {
        throw new AppException(
          "upstream",
          "We couldn't upload your media. Please try again.",
          {
            message: `Media upload failed (${response.status})`,
            context: { provider: "post-for-me-api", stage: "media-upload" },
          },
        );
      }
      return media_url;
    },
  };
}
