import { PostClient } from "../post-client";
import { google, youtube_v3 } from "googleapis";
import { SupabaseClient } from "@supabase/supabase-js";
import { wait } from "@trigger.dev/sdk";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
  YoutubeConfiguration,
} from "../post.types";

export class YouTubePostClient extends PostClient {
  #oauth2Client: any;
  #googleClientId: string;
  #googleClientSecret: string;
  #requests: any[] = [];
  #responses: any[] = [];

  // Must be a multiple of 256KB per YouTube resumable upload guidance.
  static readonly DEFAULT_CHUNK_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
  static readonly MAX_MEDIA_DOWNLOAD_ATTEMPTS = 5;
  static readonly MAX_RESUMABLE_UPLOAD_ATTEMPTS = 5;
  static readonly MAX_PROCESSING_POLL_ATTEMPTS = 20;
  static readonly MEDIA_DOWNLOAD_INITIAL_RETRY_DELAY_MS = 1_000;
  static readonly PROCESSING_POLL_INITIAL_DELAY_MS = 5_000;
  static readonly PROCESSING_POLL_MAX_DELAY_MS = 60_000;

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials,
  ) {
    super(supabaseClient, appCredentials);

    this.#googleClientId = appCredentials.app_id;
    this.#googleClientSecret = appCredentials.app_secret;
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    this.#requests.push({ refreshRequest: "refreshing access token" });
    this.#oauth2Client = new google.auth.OAuth2(
      this.#googleClientId,
      this.#googleClientSecret,
      `${process.env.NEXTAUTH_URL}/api/youtube-auth/callback`,
    );

    this.#oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: new Date(account.refresh_token_expires_at!).getTime(),
    });

    const { credentials } = await this.#oauth2Client.refreshAccessToken();

    this.#responses.push({
      refreshResponse: {
        scope: credentials.scope,
        token_type: credentials.token_type,
        expiry_date: credentials.expiry_date,
        access_token: credentials.access_token ? "[redacted]" : undefined,
        refresh_token: credentials.refresh_token ? "[redacted]" : undefined,
        id_token: credentials.id_token ? "[redacted]" : undefined,
      },
    });
    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || account.refresh_token,
      expires_at: new Date(credentials.expiry_date).toISOString(),
    };
  }

  async post({
    postId,
    account,
    caption,
    media,
    platformConfig,
  }: {
    postId: string;
    account: SocialAccount;
    caption: string;
    media: PostMedia[];
    platformConfig?: YoutubeConfiguration;
  }): Promise<PostResult> {
    let stagedFilePath: string | null = null;

    try {
      const medium = media[0];
      if (medium.type !== "video") {
        throw new Error("Only videos are supported for YouTube posts");
      }

      const { fileSize, mimeType } = await this.#getRemoteFileInfo(medium.url, {
        fallbackMimeType: "video/mp4",
      });

      // Trim and sanitize the caption
      const youtube = google.youtube({
        version: "v3",
        auth: this.#oauth2Client,
      }) as youtube_v3.Youtube;

      const parts = new Set(["snippet", "status"]);
      if (platformConfig?.localizations) parts.add("localizations");
      if (platformConfig?.recording_date) parts.add("recordingDetails");

      const videoRequest = {
        part: [...parts],
        requestBody: {
          snippet: {
            title: this.#sanitizeYouTubeCaption(
              platformConfig?.title || caption,
            ),
            description: this.#sanitizeYouTubeDescription(
              platformConfig?.description || caption,
            ),
            ...(platformConfig?.tags !== undefined && {
              tags: platformConfig.tags,
            }),
            ...(platformConfig?.category_id !== undefined && {
              categoryId: platformConfig.category_id,
            }),
            ...(platformConfig?.default_language !== undefined && {
              defaultLanguage: platformConfig.default_language,
            }),
          },
          status: {
            privacyStatus: platformConfig?.privacy_status || "public",
            selfDeclaredMadeForKids:
              platformConfig?.made_for_kids == undefined
                ? false
                : platformConfig.made_for_kids,
            containsSyntheticMedia:
              platformConfig?.contains_synthetic_media === undefined
                ? false
                : platformConfig?.contains_synthetic_media,
            ...(platformConfig?.embeddable !== undefined && {
              embeddable: platformConfig.embeddable,
            }),
            ...(platformConfig?.license !== undefined && {
              license: platformConfig.license,
            }),
            ...(platformConfig?.public_stats_viewable !== undefined && {
              publicStatsViewable: platformConfig.public_stats_viewable,
            }),
            ...(platformConfig?.publish_at !== undefined && {
              publishAt: platformConfig.publish_at,
            }),
          },
          ...(platformConfig?.localizations !== undefined && {
            localizations: platformConfig.localizations,
          }),
          ...(platformConfig?.recording_date !== undefined && {
            recordingDetails: {
              recordingDate: platformConfig.recording_date,
            },
          }),
        },
      };

      this.#requests.push({
        postRequest: {
          ...videoRequest,
          media: medium,
          upload: {
            protocol: "resumable",
            chunkSizeBytes: YouTubePostClient.DEFAULT_CHUNK_SIZE_BYTES,
            fileSize,
            mimeType,
          },
        },
      });

      const stagedMedia = await this.#downloadRemoteFileToTemp({
        fileUrl: medium.url,
        expectedFileSize: fileSize,
        mediaId: medium.id,
      });
      stagedFilePath = stagedMedia.path;

      const uploadUrl = await this.#startResumableUploadSession({
        videoRequest,
        fileSize,
        mimeType,
      });

      const uploadedVideo = await this.#uploadResumableChunks({
        uploadUrl,
        filePath: stagedMedia.path,
        fileSize,
        mimeType,
        chunkSizeBytes: YouTubePostClient.DEFAULT_CHUNK_SIZE_BYTES,
      });

      this.#responses.push({ postResponse: uploadedVideo });

      const videoId = uploadedVideo.id!;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log("Video uploaded. ID:", videoId, "URL:", videoUrl);

      // Upload custom thumbnail if provided
      if (medium.thumbnail_url) {
        try {
          await this.#uploadThumbnail(youtube, videoId, medium);
        } catch (thumbnailError) {
          console.error("Failed to upload thumbnail:", thumbnailError);
          // Don't fail the entire post if thumbnail upload fails
        }
      }

      const processingResult = await this.#pollProcessingDetails(
        youtube,
        videoId,
      );

      if (!processingResult.success) {
        return {
          success: false,
          post_id: postId,
          provider_connection_id: account.id,
          provider_post_id: videoId,
          provider_post_url: videoUrl,
          error_message: processingResult.message,
          details: {
            requests: this.#requests,
            responses: this.#responses,
          },
        };
      }

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: videoId,
        provider_post_url: videoUrl,
        details: {
          message: processingResult.message,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error: any) {
      console.error("Error Posting to YouTube:", error);
      if (error.response) {
        console.error("YouTube API error response:", error.response.data);
      }

      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: `Failed to post to Youtube: ${error.message}`,
        details: {
          error: error?.response?.data || error,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } finally {
      if (stagedFilePath) {
        await fs.unlink(stagedFilePath).catch(() => undefined);
      }
    }
  }

  async #pollProcessingDetails(
    youtube: youtube_v3.Youtube,
    videoId: string,
  ): Promise<{ success: boolean; message?: string }> {
    for (
      let attempt = 1;
      attempt <= YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS;
      attempt += 1
    ) {
      const pollRequest = {
        processingStatusPollRequest: { videoId, attempt },
      };
      this.#requests.push(pollRequest);
      console.log(
        `Polling YouTube processing status for video ${videoId} (attempt ${attempt}/${YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS})`,
      );

      const response = await youtube.videos.list({
        part: ["processingDetails", "status"],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      const processingDetails = video?.processingDetails;
      const processingStatus = processingDetails?.processingStatus;

      this.#responses.push({
        processingStatusPollResponse: {
          attempt,
          videoId,
          processingStatus,
          processingDetails,
          videoStatus: video?.status,
        },
      });

      console.log(
        `YouTube processing status for video ${videoId}: ${processingStatus}`,
      );

      if (processingStatus === "succeeded") {
        return { success: true };
      }

      if (processingStatus === "failed" || processingStatus === "terminated") {
        const failureReason = processingDetails?.processingFailureReason;
        console.error(
          `YouTube video ${videoId} processing ${processingStatus}. processingFailureReason: ${failureReason}`,
        );
        return {
          success: false,
          message: `YouTube video processing ${processingStatus}${failureReason ? `: ${failureReason}` : ""}`,
        };
      }

      // Still processing — wait with exponential backoff before next attempt
      if (attempt < YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS) {
        const waitMs = Math.min(
          YouTubePostClient.PROCESSING_POLL_MAX_DELAY_MS,
          YouTubePostClient.PROCESSING_POLL_INITIAL_DELAY_MS *
            2 ** (attempt - 1),
        );
        console.log(
          `Video ${videoId} still processing (status: ${processingStatus}); waiting ${waitMs}ms before next poll`,
        );
        this.#responses.push({
          processingStatusPollWait: { attempt, processingStatus, waitMs },
        });
        await this.#sleep(waitMs);
      }
    }

    console.warn(
      `Video ${videoId} still processing after ${YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS} polling attempts; returning success with notice`,
    );
    return {
      success: true,
      message: "Video is still processing, check YouTube for the status",
    };
  }

  async #startResumableUploadSession({
    videoRequest,
    fileSize,
    mimeType,
  }: {
    videoRequest: {
      part: string[];
      requestBody: youtube_v3.Schema$Video;
    };
    fileSize: number;
    mimeType: string;
  }): Promise<string> {
    const accessToken = await this.#getAccessToken();

    const part = encodeURIComponent(videoRequest.part.join(","));
    const url = `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=${part}`;

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
    if (!res.ok || !location) {
      const bodyText = await this.#safeReadText(res);
      throw new Error(
        `Failed to start YouTube resumable upload session: ${res.status} ${res.statusText}. ${bodyText}`,
      );
    }

    this.#responses.push({
      resumableSession: {
        status: res.status,
        location,
      },
    });

    return location;
  }

  async #downloadRemoteFileToTemp({
    fileUrl,
    expectedFileSize,
    mediaId,
  }: {
    fileUrl: string;
    expectedFileSize: number;
    mediaId: string;
  }): Promise<{ path: string; size: number }> {
    const safeMediaId = mediaId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const tempPath = path.join(
      os.tmpdir(),
      `youtube_${safeMediaId}_${Date.now()}.mp4`,
    );
    let lastErr: unknown;

    for (
      let attempt = 1;
      attempt <= YouTubePostClient.MAX_MEDIA_DOWNLOAD_ATTEMPTS;
      attempt += 1
    ) {
      try {
        await fs.unlink(tempPath).catch(() => undefined);

        const res = await fetch(fileUrl);
        if (!res.ok) {
          const bodyText = await this.#safeReadText(res);
          throw new Error(
            `Failed to download YouTube media for staging: ${res.status} ${res.statusText}. ${bodyText}`,
          );
        }
        if (!res.body) {
          throw new Error("No response body available while staging YouTube media");
        }

        await pipeline(
          Readable.fromWeb(res.body as any),
          createWriteStream(tempPath),
        );

        const stat = await fs.stat(tempPath);
        if (stat.size !== expectedFileSize) {
          throw new Error(
            `Staged YouTube media size mismatch: wrote ${stat.size} bytes but expected ${expectedFileSize}`,
          );
        }

        this.#responses.push({
          mediaStagedForYoutube: {
            attempt,
            size: stat.size,
            expectedFileSize,
          },
        });
        return { path: tempPath, size: stat.size };
      } catch (err) {
        lastErr = err;
        await fs.unlink(tempPath).catch(() => undefined);

        if (attempt === YouTubePostClient.MAX_MEDIA_DOWNLOAD_ATTEMPTS) {
          break;
        }

        const waitMs = Math.min(
          30_000,
          YouTubePostClient.MEDIA_DOWNLOAD_INITIAL_RETRY_DELAY_MS *
            2 ** (attempt - 1),
        );
        this.#responses.push({
          mediaStageRetry: {
            attempt,
            maxAttempts: YouTubePostClient.MAX_MEDIA_DOWNLOAD_ATTEMPTS,
            error: String(err),
            waitMs,
          },
        });
        await this.#sleep(waitMs);
      }
    }

    throw new Error(
      `Failed to stage YouTube media after ${YouTubePostClient.MAX_MEDIA_DOWNLOAD_ATTEMPTS} attempts: ${String(lastErr)}`,
    );
  }

  async #uploadResumableChunks({
    uploadUrl,
    filePath,
    fileSize,
    mimeType,
    chunkSizeBytes,
  }: {
    uploadUrl: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    chunkSizeBytes: number;
  }): Promise<youtube_v3.Schema$Video> {
    const stagedStat = await fs.stat(filePath);
    if (stagedStat.size !== fileSize) {
      throw new Error(
        `Staged YouTube media size changed before upload: ${stagedStat.size} bytes on disk, expected ${fileSize}`,
      );
    }

    let nextStart = 0;
    let lastErr: unknown;
    const fileHandle = await fs.open(filePath, "r");

    try {
      for (
        let attempt = 1;
        attempt <= YouTubePostClient.MAX_RESUMABLE_UPLOAD_ATTEMPTS;
        attempt += 1
      ) {
        const accessToken = await this.#getAccessToken();

        try {
          while (nextStart < fileSize) {
            const endExclusive = Math.min(nextStart + chunkSizeBytes, fileSize);
            const endInclusive = endExclusive - 1;
            const chunkLen = endExclusive - nextStart;
            const chunkBuf = Buffer.allocUnsafe(chunkLen);
            const { bytesRead } = await fileHandle.read(
              chunkBuf,
              0,
              chunkLen,
              nextStart,
            );

            if (bytesRead !== chunkLen) {
              throw new Error(
                `Staged media read returned ${bytesRead} bytes but expected ${chunkLen} bytes for bytes=${nextStart}-${endInclusive}; video would be truncated`,
              );
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
              if (lastByte == null) {
                lastByte = await this.#queryResumableUploadLastByte({
                  uploadUrl,
                  accessToken,
                  fileSize,
                });
              }

              if (lastByte == null) {
                throw new Error(
                  "YouTube resumable upload returned 308 without a Range header; cannot determine server progress",
                );
              }

              nextStart = lastByte + 1;

              this.#responses.push({
                resumableChunk: {
                  status: res.status,
                  contentRange,
                  receivedRange: range || null,
                  nextStart,
                },
              });

              continue;
            }

            if (res.ok) {
              const data = (await res.json()) as youtube_v3.Schema$Video;

              // Verify YouTube acknowledged the full file before declaring success.
              const bytesConfirmed = nextStart + bytesRead;
              if (bytesConfirmed !== fileSize) {
                throw new Error(
                  `YouTube upload completed but only ${bytesConfirmed} of ${fileSize} bytes were sent; video would be truncated`,
                );
              }

              this.#responses.push({
                resumableComplete: {
                  status: res.status,
                  contentRange,
                  videoId: data?.id,
                  bytesConfirmed,
                },
              });
              return data;
            }

            const bodyText = await this.#safeReadText(res);
            throw new Error(
              `YouTube resumable upload failed: ${res.status} ${res.statusText}. ${bodyText}`,
            );
          }

          throw new Error(
            "YouTube resumable upload ended unexpectedly without a final response",
          );
        } catch (err) {
          lastErr = err;
          if (attempt === YouTubePostClient.MAX_RESUMABLE_UPLOAD_ATTEMPTS) {
            break;
          }

          let resumeFrom: number | null = null;
          try {
            resumeFrom = await this.#queryResumableUploadLastByte({
              uploadUrl,
              accessToken,
              fileSize,
            });
            if (resumeFrom != null) {
              nextStart = resumeFrom + 1;
            }
          } catch {
            // Keep current nextStart when status check fails.
          }

          const waitMs = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
          this.#responses.push({
            resumableChunkRetry: {
              attempt,
              maxAttempts: YouTubePostClient.MAX_RESUMABLE_UPLOAD_ATTEMPTS,
              nextStart,
              resumeFrom,
              error: String(err),
              waitMs,
            },
          });
          await this.#sleep(waitMs);
        }
      }
    } finally {
      await fileHandle.close().catch(() => undefined);
    }

    throw new Error(
      `YouTube resumable chunk upload failed after ${YouTubePostClient.MAX_RESUMABLE_UPLOAD_ATTEMPTS} attempts: ${String(lastErr)}`,
    );
  }

  async #queryResumableUploadLastByte({
    uploadUrl,
    accessToken,
    fileSize,
  }: {
    uploadUrl: string;
    accessToken: string;
    fileSize: number;
  }): Promise<number | null> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": "0",
        "Content-Range": `bytes */${fileSize}`,
      },
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
    const token =
      typeof tokenResult === "string"
        ? tokenResult
        : tokenResult?.token || tokenResult?.res?.data?.access_token;

    if (!token) {
      throw new Error(
        "Could not obtain Google access token for YouTube upload",
      );
    }
    return token;
  }

  #parseLastByteFromRange(rangeHeader: string | null): number | null {
    // Format: "bytes=0-12345"
    if (!rangeHeader) {
      return null;
    }
    const match = rangeHeader.match(/(\d+)-(\d+)$/);
    if (!match) {
      return null;
    }
    const last = Number(match[2]);
    return Number.isFinite(last) ? last : null;
  }

  async #fetchWithRetry(
    url: string,
    init: RequestInit,
    opts?: { maxAttempts?: number },
  ): Promise<Response> {
    const maxAttempts = opts?.maxAttempts ?? 5;
    let attempt = 0;
    let lastErr: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;

      const waitMs = Math.min(10_000, 500 * 2 ** (attempt - 1));
      try {
        const res = await fetch(url, init);
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          // Retry throttling/transient server errors.
          this.#responses.push({
            resumableRetry: {
              attempt,
              status: res.status,
              waitMs,
            },
          });
          await this.#sleep(waitMs);
          continue;
        }

        return res;
      } catch (err) {
        lastErr = err;
        this.#responses.push({
          resumableRetry: {
            attempt,
            error: String(err),
            waitMs,
          },
        });
        await this.#sleep(waitMs);
      }
    }

    throw new Error(
      `YouTube upload request failed after retries: ${String(lastErr)}`,
    );
  }

  async #safeReadText(res: Response): Promise<string> {
    try {
      const text = await res.text();
      return text ? text.slice(0, 4000) : "";
    } catch {
      return "";
    }
  }

  async #sleep(ms: number): Promise<void> {
    await wait.for({ seconds: ms / 1000 });
  }

  #sanitizeYouTubeCaption(caption: string): string {
    // Remove invalid characters (e.g., '<', '>', '\n')
    let sanitized = caption.replace(/[<>]/g, "").replace(/\n/g, " ");

    // Remove any leading/trailing whitespace
    sanitized = sanitized.trim();

    // If the caption is empty after sanitization, use a default title
    if (sanitized.length === 0) {
      return "Untitled Video";
    }

    // If the caption is already 100 characters or less, return it as is
    if (sanitized.length <= 100) {
      return sanitized;
    }

    // Trim to 100 characters
    return sanitized.slice(0, 100);
  }

  async #uploadThumbnail(
    youtube: youtube_v3.Youtube,
    videoId: string,
    medium: PostMedia,
  ): Promise<void> {
    if (!medium.thumbnail_url) {
      return;
    }

    try {
      const res = await fetch(medium.thumbnail_url);
      if (!res.ok) {
        const bodyText = await this.#safeReadText(res);
        throw new Error(
          `Failed to download thumbnail: ${res.status} ${res.statusText}. ${bodyText}`,
        );
      }

      const imageBuffer = Buffer.from(await res.arrayBuffer());

      const rawContentType = res.headers.get("content-type") ?? "image/jpeg";
      const mimeType = rawContentType.split(";")[0].trim() || "image/jpeg";

      this.#requests.push({
        thumbnailUploadRequest: {
          videoId,
          thumbnail: medium.thumbnail_url,
          mimeType,
          sizeBytes: imageBuffer.length,
        },
      });

      const thumbnailResponse = await youtube.thumbnails.set({
        videoId: videoId,
        media: {
          body: imageBuffer,
          mimeType,
        },
      });

      this.#responses.push({ thumbnailResponse: thumbnailResponse.data });
      console.log("Thumbnail uploaded successfully for video:", videoId);
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      this.#responses.push({
        thumbnailError: {
          videoId,
          thumbnail: medium.thumbnail_url,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  async #getRemoteFileInfo(
    url: string,
    opts?: { fallbackMimeType?: string },
  ): Promise<{ fileSize: number; mimeType: string }> {
    // Prefer HEAD for metadata.
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok) {
        const size = Number(head.headers.get("content-length") || "");
        const mimeType =
          head.headers.get("content-type") ||
          opts?.fallbackMimeType ||
          "application/octet-stream";
        if (Number.isFinite(size) && size > 0) {
          return { fileSize: size, mimeType };
        }
      }
    } catch {
      // ignore and fall back
    }

    // Fallback: range request to read total size from Content-Range.
    const res = await fetch(url, {
      headers: {
        Range: "bytes=0-0",
      },
    });

    if (!res.ok) {
      const bodyText = await this.#safeReadText(res);
      throw new Error(
        `Could not determine file size: ${res.status} ${res.statusText}. ${bodyText}`,
      );
    }

    // Consume the tiny body to allow connection reuse.
    await res.arrayBuffer().catch(() => undefined);

    const contentRange =
      res.headers.get("content-range") || res.headers.get("Content-Range");
    const fileSize = this.#parseTotalSizeFromContentRange(contentRange);
    const mimeType =
      res.headers.get("content-type") ||
      opts?.fallbackMimeType ||
      "application/octet-stream";

    if (!fileSize || fileSize <= 0) {
      throw new Error("Could not determine YouTube upload file size");
    }

    return { fileSize, mimeType };
  }

  #parseTotalSizeFromContentRange(contentRange: string | null): number | null {
    // Example: "bytes 0-0/12345"
    if (!contentRange) return null;
    const match = contentRange.match(/\/(\d+)$/);
    if (!match) return null;
    const total = Number(match[1]);
    return Number.isFinite(total) ? total : null;
  }

  #sanitizeYouTubeDescription(description: string): string | null {
    // Remove invalid characters (e.g., '<', '>') but keep newlines
    let sanitized = description.replace(/[<>]/g, "");

    // Remove any leading/trailing whitespace but keep internal whitespace
    sanitized = sanitized.trim();

    // If the description is empty after sanitization, return null
    if (sanitized.length === 0) {
      return null;
    }

    // Trim to 2200 characters
    return sanitized.slice(0, 2200);
  }
}
