import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import { task } from "@trigger.dev/sdk";
import { TimestampedArray } from "./posting/timestamped-array";
import type { PostMedia } from "./posting/post.types";

type Payload = { medium: PostMedia; accessToken: string; mediaUrl: string };
type UploadResult = {
  requests: Record<string, unknown>[];
  responses: Record<string, unknown>[];
} & (
  | { success: true; mediaId: string }
  | { success: false; message: string; error: unknown }
);

export const uploadPinterestVideo = task({
  id: "upload-pinterest-video",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ medium, accessToken, mediaUrl }: Payload, { ctx }): Promise<UploadResult> => {
    const requests = new TimestampedArray();
    const responses = new TimestampedArray();
    let source: Readable | undefined;
    let multipart: FormData | undefined;
    let downloading = false;
    try {
      requests.push({ registerMediaRequest: mediaUrl });
      const registerMediaResponse = await axios.post(mediaUrl, { media_type: "video" }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      responses.push({ registerMediaResponse: registerMediaResponse.data });
      const mediaId = registerMediaResponse.data.media_id;
      const { upload_url, upload_parameters } = registerMediaResponse.data;
      const fileUrl = medium.url;
      downloading = true;
      const fileResponse = await axios.get(fileUrl, { responseType: "stream" });
      source = fileResponse.data;
      downloading = false;
      const filename = new URL(fileUrl).pathname.split("/").pop() || `video_${mediaId}.mp4`;
      const contentTypeHeader = fileResponse.headers["content-type"];
      const contentType = typeof contentTypeHeader === "string" && contentTypeHeader
        ? contentTypeHeader : "video/mp4";
      const knownLengthRaw = fileResponse.headers["content-length"];
      const knownLength = knownLengthRaw ? Number(knownLengthRaw) : undefined;
      const form = multipart = new FormData();
      form.append("Content-Type", "multipart/form-data");
      Object.entries(upload_parameters).forEach(([key, value]) => {
        if (key !== "Content-Type") form.append(key, value);
      });
      form.append("file", fileResponse.data, {
        filename, contentType,
        ...(Number.isFinite(knownLength as number) && (knownLength as number) > 0
          ? { knownLength: knownLength as number } : {}),
      });
      requests.push({ uploadRequest: { file: medium } });
      const headers: Record<string, string> = { ...form.getHeaders() };
      try {
        const formLength = await new Promise<number>((resolve, reject) => {
          form.getLength((err, length) => {
            if (err) reject(err);
            else resolve(length);
          });
        });
        headers["Content-Length"] = String(formLength);
      } catch {
        // Best-effort Content-Length, as in the original relay.
      }
      const uploadResponse = await axios.post(upload_url, form, {
        headers, maxContentLength: Infinity, maxBodyLength: Infinity,
      });
      responses.push({ uploadResponse: uploadResponse.status });
      if (uploadResponse.status !== 204) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      return { success: true, mediaId, requests, responses };
    } catch (error) {
      const responseData = error.response?.data;
      const responseStream = responseData instanceof Readable;
      if (responseStream) responseData.destroy();
      if (ctx.attempt.number < 2) throw error;
      const message = String(error.message || error).slice(0, 1024);
      let diagnostic: unknown = {
        name: String(error.name || "Error").slice(0, 128),
        message,
        status: typeof error.response?.status === "number" ? error.response.status : undefined,
        statusText: typeof error.response?.statusText === "string"
          ? error.response.statusText.slice(0, 256) : undefined,
      };
      if (!downloading && !responseStream && responseData) {
        try {
          // Keep provider JSON, but never carry circular or oversized transport objects.
          const json = JSON.stringify(responseData);
          if (json && json.length <= 16_384) diagnostic = JSON.parse(json);
        } catch {
          // Fall back to the bounded HTTP diagnostic.
        }
      } else if (!error.response) {
        diagnostic = message;
      }
      return {
        success: false, message,
        error: diagnostic,
        requests, responses,
      };
    } finally {
      source?.destroy();
      multipart?.destroy();
    }
  },
});
