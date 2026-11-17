import { logger, OutOfMemoryError, task, wait } from "@trigger.dev/sdk";
import { google, type youtube_v3 } from "googleapis";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { PostMedia } from "./posting/post.types";
import { TimestampedArray } from "./posting/timestamped-array";

type YoutubeVideoPayload = {
  medium: PostMedia;
  videoRequest: { part: string[]; requestBody: youtube_v3.Schema$Video };
  oauth: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    credentials: Parameters<InstanceType<typeof google.auth.OAuth2>["setCredentials"]>[0];
  };
};

type YoutubeVideoResult = {
  requests: Record<string, unknown>[];
  responses: Record<string, unknown>[];
} & (
  | { success: true; video: youtube_v3.Schema$Video }
  | { success: false; error: { name: string; message: string; stack?: string; response?: { data: unknown } } }
);

export function isRetriableYouTubeSessionInitError(status: number, bodyText: string): boolean {
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  if (status === 409) {
    try {
      const parsed = JSON.parse(bodyText);
      return parsed?.error?.errors?.[0]?.reason === "alreadyExists";
    } catch {
      return false;
    }
  }
  return false;
}

class YoutubeVideoUploader {
  requests = new TimestampedArray();
  responses = new TimestampedArray();
  #oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  // Must be a multiple of 256KB per YouTube resumable upload guidance.
  static readonly DEFAULT_CHUNK_SIZE_BYTES = 8 * 1024 * 1024;
  static readonly MAX_MEDIA_DOWNLOAD_ATTEMPTS = 5;
  static readonly MAX_RESUMABLE_UPLOAD_ATTEMPTS = 5;
  static readonly MAX_SESSION_INIT_ATTEMPTS = 3;
  static readonly MEDIA_DOWNLOAD_INITIAL_RETRY_DELAY_MS = 1_000;

  constructor(oauth: YoutubeVideoPayload["oauth"]) {
    this.#oauth2Client = new google.auth.OAuth2(oauth.clientId, oauth.clientSecret, oauth.redirectUri);
    this.#oauth2Client.setCredentials(oauth.credentials);
  }

  async upload({ medium, videoRequest }: YoutubeVideoPayload): Promise<youtube_v3.Schema$Video> {
    let stagedFilePath: string | null = null;
    try {
      const { fileSize, mimeType } = await this.#getRemoteFileInfo(medium.url, { fallbackMimeType: "video/mp4" });
      this.requests.push({
        postRequest: {
          ...videoRequest,
          media: medium,
          upload: { protocol: "resumable", chunkSizeBytes: YoutubeVideoUploader.DEFAULT_CHUNK_SIZE_BYTES, fileSize, mimeType },
        },
      });
      const stagedMedia = await this.#downloadRemoteFileToTemp({ fileUrl: medium.url, expectedFileSize: fileSize, mediaId: medium.id });
      stagedFilePath = stagedMedia.path;
      const uploadUrl = await this.#startResumableUploadSession({ videoRequest, fileSize, mimeType });
      const video = await this.#uploadResumableChunks({ uploadUrl, filePath: stagedMedia.path, fileSize, mimeType, chunkSizeBytes: YoutubeVideoUploader.DEFAULT_CHUNK_SIZE_BYTES });
      this.responses.push({ postResponse: video });
      return video;
    } finally {
      if (stagedFilePath) await fs.unlink(stagedFilePath).catch(() => undefined);
    }
  }

  async #startResumableUploadSession({ videoRequest, fileSize, mimeType }: {
    videoRequest: YoutubeVideoPayload["videoRequest"];
    fileSize: number;
    mimeType: string;
  }): Promise<string> {
    const accessToken = await this.#getAccessToken();
    const part = encodeURIComponent(videoRequest.part.join(","));
    const url = `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=${part}`;
    logger.info("Starting YouTube resumable upload session", { fileSize, mimeType, part: videoRequest.part });
    for (let attempt = 1; attempt <= YoutubeVideoUploader.MAX_SESSION_INIT_ATTEMPTS; attempt += 1) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(fileSize),
          "X-Upload-Content-Type": mimeType,
        },
        body: JSON.stringify(videoRequest.requestBody ?? {}),
      });
      const location = res.headers.get("location") || res.headers.get("Location");
      if (res.ok && location) {
        this.responses.push({ resumableSession: { status: res.status, location } });
        logger.info("Started YouTube resumable upload session", { status: res.status, fileSize, mimeType });
        return location;
      }
      const bodyText = await this.#safeReadText(res);
      const retriable = isRetriableYouTubeSessionInitError(res.status, bodyText);
      if (retriable && attempt < YoutubeVideoUploader.MAX_SESSION_INIT_ATTEMPTS) {
        const waitMs = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
        this.responses.push({ sessionInitRetry: { attempt, maxAttempts: YoutubeVideoUploader.MAX_SESSION_INIT_ATTEMPTS, status: res.status, waitMs } });
        logger.warn("Retrying YouTube resumable upload session init", { attempt, maxAttempts: YoutubeVideoUploader.MAX_SESSION_INIT_ATTEMPTS, status: res.status, statusText: res.statusText, waitMs });
        await this.#sleep(waitMs);
        continue;
      }
      throw new Error(`Failed to start YouTube resumable upload session: ${res.status} ${res.statusText}. ${bodyText}`);
    }
    throw new Error("Failed to start YouTube resumable upload session: exhausted retry attempts");
  }

  async #downloadRemoteFileToTemp({ fileUrl, expectedFileSize, mediaId }: {
    fileUrl: string;
    expectedFileSize: number;
    mediaId: string;
  }): Promise<{ path: string; size: number }> {
    const safeMediaId = mediaId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const tempPath = path.join(os.tmpdir(), `youtube_${safeMediaId}_${Date.now()}.mp4`);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= YoutubeVideoUploader.MAX_MEDIA_DOWNLOAD_ATTEMPTS; attempt += 1) {
      try {
        await fs.unlink(tempPath).catch(() => undefined);
        logger.info("Downloading YouTube media to temp file", { attempt, maxAttempts: YoutubeVideoUploader.MAX_MEDIA_DOWNLOAD_ATTEMPTS, expectedFileSize, mediaId, tempPath });
        const res = await fetch(fileUrl);
        if (!res.ok) {
          const bodyText = await this.#safeReadText(res);
          throw new Error(`Failed to download YouTube media for staging: ${res.status} ${res.statusText}. ${bodyText}`);
        }
        if (!res.body) throw new Error("No response body available while staging YouTube media");
        await pipeline(Readable.fromWeb(res.body as any), createWriteStream(tempPath));
        const stat = await fs.stat(tempPath);
        if (stat.size !== expectedFileSize) {
          logger.warn("Staged YouTube media size mismatch", { attempt, expectedFileSize, actualFileSize: stat.size, mediaId, tempPath });
          throw new Error(`Staged YouTube media size mismatch: wrote ${stat.size} bytes but expected ${expectedFileSize}`);
        }
        logger.info("Downloaded YouTube media to temp file", { attempt, size: stat.size, expectedFileSize, mediaId, tempPath });
        this.responses.push({ mediaStagedForYoutube: { attempt, size: stat.size, expectedFileSize } });
        return { path: tempPath, size: stat.size };
      } catch (err) {
        lastErr = err;
        await fs.unlink(tempPath).catch(() => undefined);
        if (err instanceof OutOfMemoryError) throw err;
        if (attempt === YoutubeVideoUploader.MAX_MEDIA_DOWNLOAD_ATTEMPTS) break;
        const waitMs = Math.min(30_000, YoutubeVideoUploader.MEDIA_DOWNLOAD_INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
        this.responses.push({ mediaStageRetry: { attempt, maxAttempts: YoutubeVideoUploader.MAX_MEDIA_DOWNLOAD_ATTEMPTS, error: String(err), waitMs } });
        logger.warn("Retrying YouTube media temp-file download", { attempt, maxAttempts: YoutubeVideoUploader.MAX_MEDIA_DOWNLOAD_ATTEMPTS, expectedFileSize, mediaId, error: String(err), waitMs });
        await this.#sleep(waitMs);
      }
    }
    throw new Error(`Failed to stage YouTube media after ${YoutubeVideoUploader.MAX_MEDIA_DOWNLOAD_ATTEMPTS} attempts: ${String(lastErr)}`);
  }

  async #uploadResumableChunks({ uploadUrl, filePath, fileSize, mimeType, chunkSizeBytes }: {
    uploadUrl: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    chunkSizeBytes: number;
  }): Promise<youtube_v3.Schema$Video> {
    const stagedStat = await fs.stat(filePath);
    if (stagedStat.size !== fileSize) {
      throw new Error(`Staged YouTube media size changed before upload: ${stagedStat.size} bytes on disk, expected ${fileSize}`);
    }
    logger.info("Uploading staged media to YouTube", { fileSize, stagedFileSize: stagedStat.size, chunkSizeBytes, filePath });
    let nextStart = 0;
    let lastErr: unknown;
    const fileHandle = await fs.open(filePath, "r");
    try {
      for (let attempt = 1; attempt <= YoutubeVideoUploader.MAX_RESUMABLE_UPLOAD_ATTEMPTS; attempt += 1) {
        const accessToken = await this.#getAccessToken();
        try {
          while (nextStart < fileSize) {
            const endExclusive = Math.min(nextStart + chunkSizeBytes, fileSize);
            const endInclusive = endExclusive - 1;
            const chunkLen = endExclusive - nextStart;
            logger.info("Uploading YouTube resumable chunk", { attempt, nextStart, endInclusive, chunkLen, fileSize });
            const chunkBuf = Buffer.allocUnsafe(chunkLen);
            const { bytesRead } = await fileHandle.read(chunkBuf, 0, chunkLen, nextStart);
            if (bytesRead !== chunkLen) {
              throw new Error(`Staged media read returned ${bytesRead} bytes but expected ${chunkLen} bytes for bytes=${nextStart}-${endInclusive}; video would be truncated`);
            }
            const contentRange = `bytes ${nextStart}-${endInclusive}/${fileSize}`;
            const res = await this.#fetchWithRetry(uploadUrl, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": mimeType,
                "Content-Length": String(bytesRead),
                "Content-Range": contentRange,
              },
              body: chunkBuf,
            });
            if (res.status === 308) {
              // Resume Incomplete; server returns last received byte in Range header.
              const range = res.headers.get("range") || res.headers.get("Range");
              let lastByte = this.#parseLastByteFromRange(range);
              // Some intermediaries strip Range headers; ask the upload URL for its state.
              if (lastByte == null) lastByte = await this.#queryResumableUploadLastByte({ uploadUrl, accessToken, fileSize });
              if (lastByte == null) {
                throw new Error("YouTube resumable upload returned 308 without a Range header; cannot determine server progress");
              }
              nextStart = lastByte + 1;
              this.responses.push({ resumableChunk: { status: res.status, contentRange, receivedRange: range || null, nextStart } });
              logger.info("Uploaded YouTube resumable chunk", { attempt, status: res.status, contentRange, receivedRange: range || null, nextStart, fileSize });
              continue;
            }
            if (res.ok) {
              const data = (await res.json()) as youtube_v3.Schema$Video;
              // Verify YouTube acknowledged the full file before declaring success.
              const bytesConfirmed = nextStart + bytesRead;
              if (bytesConfirmed !== fileSize) {
                throw new Error(`YouTube upload completed but only ${bytesConfirmed} of ${fileSize} bytes were sent; video would be truncated`);
              }
              this.responses.push({ resumableComplete: { status: res.status, contentRange, videoId: data?.id, bytesConfirmed } });
              logger.info("Completed YouTube resumable upload", { attempt, status: res.status, contentRange, videoId: data?.id, bytesConfirmed, fileSize });
              return data;
            }
            const bodyText = await this.#safeReadText(res);
            throw new Error(`YouTube resumable upload failed: ${res.status} ${res.statusText}. ${bodyText}`);
          }
          throw new Error("YouTube resumable upload ended unexpectedly without a final response");
        } catch (err) {
          if (err instanceof OutOfMemoryError) throw err;
          lastErr = err;
          if (attempt === YoutubeVideoUploader.MAX_RESUMABLE_UPLOAD_ATTEMPTS) break;
          let resumeFrom: number | null = null;
          try {
            resumeFrom = await this.#queryResumableUploadLastByte({ uploadUrl, accessToken, fileSize });
            if (resumeFrom != null) nextStart = resumeFrom + 1;
          } catch (error) {
            if (error instanceof OutOfMemoryError) throw error;
            // Keep current nextStart when status check fails.
          }
          const waitMs = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
          this.responses.push({ resumableChunkRetry: { attempt, maxAttempts: YoutubeVideoUploader.MAX_RESUMABLE_UPLOAD_ATTEMPTS, nextStart, resumeFrom, error: String(err), waitMs } });
          logger.warn("Retrying YouTube resumable upload", { attempt, maxAttempts: YoutubeVideoUploader.MAX_RESUMABLE_UPLOAD_ATTEMPTS, nextStart, resumeFrom, error: String(err), waitMs });
          await this.#sleep(waitMs);
        }
      }
    } finally {
      await fileHandle.close().catch(() => undefined);
    }
    throw new Error(`YouTube resumable chunk upload failed after ${YoutubeVideoUploader.MAX_RESUMABLE_UPLOAD_ATTEMPTS} attempts: ${String(lastErr)}`);
  }

  async #queryResumableUploadLastByte({ uploadUrl, accessToken, fileSize }: {
    uploadUrl: string;
    accessToken: string;
    fileSize: number;
  }): Promise<number | null> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Length": "0", "Content-Range": `bytes */${fileSize}` },
    });
    if (res.status === 308) {
      const range = res.headers.get("range") || res.headers.get("Range");
      return this.#parseLastByteFromRange(range);
    }
    // If it's already complete, caller will naturally hit completion on next loop.
    return null;
  }

  async #getAccessToken(): Promise<string> {
    const tokenResult = await this.#oauth2Client.getAccessToken();
    const token = typeof tokenResult === "string" ? tokenResult : tokenResult?.token || tokenResult?.res?.data?.access_token;
    if (!token) throw new Error("Could not obtain Google access token for YouTube upload");
    return token;
  }

  #parseLastByteFromRange(rangeHeader: string | null): number | null {
    if (!rangeHeader) return null;
    const match = rangeHeader.match(/(\d+)-(\d+)$/);
    if (!match) return null;
    const last = Number(match[2]);
    return Number.isFinite(last) ? last : null;
  }

  async #fetchWithRetry(url: string, init: RequestInit, opts?: { maxAttempts?: number }): Promise<Response> {
    const maxAttempts = opts?.maxAttempts ?? 5;
    let attempt = 0;
    let lastErr: unknown;
    while (attempt < maxAttempts) {
      attempt += 1;
      const waitMs = Math.min(10_000, 500 * 2 ** (attempt - 1));
      try {
        const res = await fetch(url, init);
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          this.responses.push({ resumableRetry: { attempt, status: res.status, waitMs } });
          await this.#sleep(waitMs);
          continue;
        }
        return res;
      } catch (err) {
        if (err instanceof OutOfMemoryError) throw err;
        lastErr = err;
        this.responses.push({ resumableRetry: { attempt, error: String(err), waitMs } });
        await this.#sleep(waitMs);
      }
    }
    throw new Error(`YouTube upload request failed after retries: ${String(lastErr)}`);
  }

  async #safeReadText(res: Response): Promise<string> {
    try {
      const text = await res.text();
      return text ? text.slice(0, 4000) : "";
    } catch (error) {
      if (error instanceof OutOfMemoryError) throw error;
      return "";
    }
  }

  async #sleep(ms: number): Promise<void> {
    await wait.for({ seconds: ms / 1000 });
  }

  async #getRemoteFileInfo(url: string, opts?: { fallbackMimeType?: string }): Promise<{ fileSize: number; mimeType: string }> {
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok) {
        const size = Number(head.headers.get("content-length") || "");
        const mimeType = head.headers.get("content-type") || opts?.fallbackMimeType || "application/octet-stream";
        if (Number.isFinite(size) && size > 0) return { fileSize: size, mimeType };
      }
    } catch (error) {
      if (error instanceof OutOfMemoryError) throw error;
      // Ignore and fall back to a range metadata request.
    }
    const res = await fetch(url, { headers: { Range: "bytes=0-0" } });
    try {
      if (!res.ok) {
        throw new Error(`Could not determine file size: ${res.status} ${res.statusText}`);
      }
      // Never consume this body: a source can ignore Range and send the full video.
      const match = res.headers.get("content-range")?.match(/^bytes 0-0\/(\d+)$/i);
      const fileSize = match ? Number(match[1]) : 0;
      if (res.status !== 206 || !Number.isSafeInteger(fileSize) || fileSize <= 0) {
        throw new Error("Could not determine YouTube upload file size");
      }
      return { fileSize, mimeType: res.headers.get("content-type") || opts?.fallbackMimeType || "application/octet-stream" };
    } finally {
      await res.body?.cancel().catch(() => undefined);
    }
  }
}

export const uploadYoutubeVideo = task({
  id: "upload-youtube-video",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async (payload: YoutubeVideoPayload): Promise<YoutubeVideoResult> => {
    let uploader: YoutubeVideoUploader | undefined;
    try {
      uploader = new YoutubeVideoUploader(payload.oauth);
      const video = await uploader.upload(payload);
      return { success: true, video, requests: uploader.requests, responses: uploader.responses };
    } catch (error) {
      if (error instanceof OutOfMemoryError) throw error;
      // Ordinary failures must not replay a task that may already have created a video.
      const failure = error as Error & { response?: { data: unknown } };
      return {
        success: false,
        error: {
          name: failure?.name || "Error",
          message: failure?.message || String(error),
          stack: failure?.stack,
          ...(failure?.response ? { response: { data: failure.response.data } } : {}),
        },
        requests: uploader?.requests ?? [],
        responses: uploader?.responses ?? [],
      };
    }
  },
});
