import { task, tasks } from "@trigger.dev/sdk";
import { createReadStream } from "fs";
import fetch from "node-fetch";
import type { AppBskyVideoDefs } from "@atproto/api";
import { PostClient } from "./posting/post-client";
import type { StoredMedia } from "./media-recipes";
import { liveMediaExecutor } from "./live-media-runtime";
import { prepareLiveBlueskyVideo } from "./live-media";
import { resolveMediaProcessingBackend, type MediaProcessingRouting } from "./media-processing-backend";
import type { probeVideoDimensions } from "./video-child-tasks";
import type { ffmpegCompressVideo } from "./ffmpeg-compress-video";

type Payload = MediaProcessingRouting & { url: string; token: string; did: string; mediumId?: string; stored?: StoredMedia; skipProcessing?: boolean };
type UploadResult = {
  requests: Record<string, unknown>[];
  responses: Record<string, unknown>[];
} & (
  | { success: true; jobStatus: AppBskyVideoDefs.JobStatus; width: number | undefined; height: number | undefined }
  | { success: false; error: { name: string; message: string; cause?: unknown } }
);

class BlueskyVideoUploader extends PostClient {
  async upload({ url, token, did, mediumId, stored, skipProcessing, mediaProcessingBackend }: Payload, runId: string) {
    const backend = resolveMediaProcessingBackend(mediumId || url, mediaProcessingBackend);
    let fileUrl = url;
    let contentType: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    if (backend === "zenith") {
      const execute = liveMediaExecutor(runId);
      const source = stored ?? await execute("localize", mediumId || "video", { task: "media.localize", url });
      const result = await prepareLiveBlueskyVideo(source, mediumId || "video", !!skipProcessing, execute);
      if (result.media.kind !== "video") throw new Error("Expected Bluesky video metadata");
      fileUrl = result.url;
      contentType = result.contentType;
      ({ width, height } = result.media);
    } else {
      if (!skipProcessing) {
        const compressed = await tasks.triggerAndWait<typeof ffmpegCompressVideo>("ffmpeg-compress-video", {
          url, maxSizeBytes: 100_000_000, mediaProcessingBackend: "trigger",
        });
        fileUrl = compressed.ok ? compressed.output : url;
      }
      const dimensions = await tasks.triggerAndWait<typeof probeVideoDimensions>("probe-video-dimensions", {
        url: fileUrl, mediaProcessingBackend: "trigger",
      });
      if (!dimensions.ok) throw new Error("Failed to probe Bluesky video dimensions", { cause: dimensions.error });
      ({ width, height } = dimensions.output);
    }
    const remoteName = new URL(fileUrl).pathname.split("/").pop() || "video.mp4";
    const tmp = await this.downloadToTempFile(fileUrl, {
      prefix: "bluesky_video", filename: remoteName,
    });
    let uploadResponseData: unknown;
    try {
      const uploadUrl = new URL("https://video.bsky.app/xrpc/app.bsky.video.uploadVideo");
      uploadUrl.searchParams.append("did", did);
      uploadUrl.searchParams.append("name", remoteName);
      this.requests.push({ uploadVideoRequest: uploadUrl });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType || tmp.mimeType || "video/mp4",
          "Content-Length": tmp.size.toString(),
        },
        body: createReadStream(tmp.filePath) as any,
      });
      uploadResponseData = await response.json();
    } finally {
      await this.unlinkQuiet(tmp.filePath);
    }
    this.responses.push({ uploadVideoResponse: uploadResponseData });
    return { jobStatus: uploadResponseData as AppBskyVideoDefs.JobStatus, width, height };
  }

  diagnostics() { return { requests: this.requests, responses: this.responses }; }
}

export const uploadBlueskyVideo = task({
  id: "upload-bluesky-video",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async (payload: Payload, { ctx }): Promise<UploadResult> => {
    const uploader = new BlueskyVideoUploader({ app_id: "", app_secret: "" });
    try {
      return { success: true, ...await uploader.upload(payload, ctx.run.id), ...uploader.diagnostics() };
    } catch (error) {
      if (ctx.attempt.number < 2) throw error;
      return {
        success: false,
        error: { name: error.name, message: error.message, cause: error.cause },
        ...uploader.diagnostics(),
      };
    }
  },
});
