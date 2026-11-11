import { task } from "@trigger.dev/sdk";
import { createReadStream } from "fs";
import fetch from "node-fetch";
import type { AppBskyVideoDefs } from "@atproto/api";
import { PostClient } from "./posting/post-client";
import type { StoredMedia } from "./media-recipes";
import { liveMediaExecutor } from "./live-media-runtime";
import { prepareLiveBlueskyVideo } from "./live-media";

type Payload = { url: string; token: string; did: string; mediumId?: string; stored?: StoredMedia; skipProcessing?: boolean };
type UploadResult = {
  requests: Record<string, unknown>[];
  responses: Record<string, unknown>[];
} & (
  | { success: true; jobStatus: AppBskyVideoDefs.JobStatus; width: number | undefined; height: number | undefined }
  | { success: false; error: { name: string; message: string; cause?: unknown } }
);

class BlueskyVideoUploader extends PostClient {
  async upload({ url, token, did, mediumId = "video", stored, skipProcessing }: Payload, runId: string) {
    const execute = liveMediaExecutor(runId);
    const source = stored ?? await execute("localize", mediumId, { task: "media.localize", url });
    const result = await prepareLiveBlueskyVideo(source, mediumId, !!skipProcessing, execute);
    if (result.media.kind !== "video") throw new Error("Expected Bluesky video metadata");
    const fileUrl = result.url;
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
          "Content-Type": result.contentType,
          "Content-Length": tmp.size.toString(),
        },
        body: createReadStream(tmp.filePath) as any,
      });
      uploadResponseData = await response.json();
    } finally {
      await this.unlinkQuiet(tmp.filePath);
    }
    this.responses.push({ uploadVideoResponse: uploadResponseData });
    return { jobStatus: uploadResponseData as AppBskyVideoDefs.JobStatus, width: result.media.width, height: result.media.height };
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
