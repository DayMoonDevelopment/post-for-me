/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { PostClient } from "../post-client";
import { google, youtube_v3 } from "googleapis";
import { Readable } from "stream";
import { SupabaseClient } from "@supabase/supabase-js";
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

    this.#responses.push({ refreshResponse: credentials });
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
    try {
      const medium = media[0];
      if (medium.type !== "video") {
        throw new Error("Only videos are supported for YouTube posts");
      }

      const file = await this.getFile(medium);

      const fileSize = (file as any)?.size as number | undefined;
      if (!fileSize || fileSize <= 0) {
        throw new Error("Could not determine YouTube upload file size");
      }

      const mimeType = (file as any)?.type || "video/mp4";

      // Trim and sanitize the caption
      const sanitizedCaption = this.#sanitizeYouTubeCaption(caption);
      const youtube = google.youtube({
        version: "v3",
        auth: this.#oauth2Client,
      }) as youtube_v3.Youtube;

      const madeForKids =
        platformConfig?.made_for_kids == undefined
          ? false
          : platformConfig.made_for_kids;

      const videoRequest = {
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: platformConfig?.title
              ? this.#sanitizeYouTubeCaption(platformConfig.title)
              : sanitizedCaption,
            description: this.#sanitizeYouTubeDescription(caption),
          },
          status: {
            privacyStatus: platformConfig?.privacy_status || "public",
            selfDeclaredMadeForKids: madeForKids,
          },
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

      const uploadUrl = await this.#startResumableUploadSession({
        videoRequest,
        fileSize,
        mimeType,
      });

      const uploadedVideo = await this.#uploadResumableChunks({
        uploadUrl,
        file,
        fileSize,
        mimeType,
        chunkSizeBytes: YouTubePostClient.DEFAULT_CHUNK_SIZE_BYTES,
      });

      this.#responses.push({ postResponse: uploadedVideo });

      const videoId = uploadedVideo?.id;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log("Video uploaded. ID:", videoId, "URL:", videoUrl);

      // Upload custom thumbnail if provided
      if (videoId && medium.thumbnail_url) {
        try {
          await this.#uploadThumbnail(youtube, videoId, medium);
        } catch (thumbnailError) {
          console.error("Failed to upload thumbnail:", thumbnailError);
          // Don't fail the entire post if thumbnail upload fails
        }
      }

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: videoId || undefined,
        provider_post_url: videoUrl,
        details: {
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error: any) {
      console.error("Error in the uh postToYouTube:", error);
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
    }
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

  async #uploadResumableChunks({
    uploadUrl,
    file,
    fileSize,
    mimeType,
    chunkSizeBytes,
  }: {
    uploadUrl: string;
    file: any;
    fileSize: number;
    mimeType: string;
    chunkSizeBytes: number;
  }): Promise<youtube_v3.Schema$Video> {
    let nextStart = 0;
    const accessToken = await this.#getAccessToken();

    while (nextStart < fileSize) {
      const endExclusive = Math.min(nextStart + chunkSizeBytes, fileSize);
      const endInclusive = endExclusive - 1;
      const chunkLen = endExclusive - nextStart;

      // Read only the next slice into memory.
      const chunkBuf = Buffer.from(
        await (file as any).slice(nextStart, endExclusive).arrayBuffer(),
      );

      const contentRange = `bytes ${nextStart}-${endInclusive}/${fileSize}`;
      const res = await this.#fetchWithRetry(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
          "Content-Length": String(chunkLen),
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
        this.#responses.push({
          resumableComplete: {
            status: res.status,
            contentRange,
            videoId: data?.id,
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
      try {
        const res = await fetch(url, init);
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          // Retry throttling/transient server errors.
          const waitMs = Math.min(10_000, 500 * 2 ** (attempt - 1));
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
        const waitMs = Math.min(10_000, 500 * 2 ** (attempt - 1));
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
    await new Promise((resolve) => setTimeout(resolve, ms));
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
      // Get the thumbnail file
      const thumbnailFile = await this.getFile({
        url: medium.thumbnail_url,
        type: "image",
      });

      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailStream = new Readable();
      thumbnailStream.push(thumbnailBuffer);
      thumbnailStream.push(null);

      this.#requests.push({
        thumbnailUploadRequest: {
          videoId,
          thumbnail: medium.thumbnail_url,
        },
      });

      const thumbnailResponse = await youtube.thumbnails.set({
        videoId: videoId,
        media: {
          body: thumbnailStream,
          mimeType: thumbnailFile.type || "image/jpeg",
        },
      });

      this.#responses.push({ thumbnailResponse: thumbnailResponse.data });
      console.log("Thumbnail uploaded successfully for video:", videoId);
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      throw error;
    }
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
