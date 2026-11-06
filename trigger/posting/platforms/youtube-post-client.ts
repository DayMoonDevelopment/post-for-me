import { PostClient } from "../post-client";
import { google, youtube_v3 } from "googleapis";
import { logger, tasks, wait } from "@trigger.dev/sdk";
import type { generateYoutubeTimestampThumbnail } from "../../video-child-tasks";
import type { uploadYoutubeThumbnail } from "../../upload-youtube-thumbnail";
import type { uploadYoutubeVideo } from "../../upload-youtube-video";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
  YoutubeConfiguration,
  YoutubeLocalization,
} from "../post.types";

// YouTube limits snippet.description to 5,000 bytes (UTF-8), not characters.
export const YOUTUBE_MAX_DESCRIPTION_BYTES = 5000;
const YOUTUBE_MAX_TITLE_CHARS = 100;

/**
 * Truncates text to at most `maxBytes` of UTF-8, cutting only on code point
 * boundaries so multi-byte characters and surrogate pairs are never split.
 */
export function truncateToUtf8Bytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;

  let bytes = 0;
  let end = 0;
  for (const codePoint of text) {
    const size = Buffer.byteLength(codePoint, "utf8");
    if (bytes + size > maxBytes) break;
    bytes += size;
    end += codePoint.length;
  }
  return text.slice(0, end);
}

export function sanitizeYouTubeDescription(description: string): {
  value: string | null;
  truncated: boolean;
  originalBytes: number;
} {
  // Remove invalid characters but preserve internal whitespace and newlines.
  const sanitized = description.replace(/[<>]/g, "").trim();
  if (sanitized.length === 0) {
    return { value: null, truncated: false, originalBytes: 0 };
  }
  const originalBytes = Buffer.byteLength(sanitized, "utf8");
  const value = truncateToUtf8Bytes(sanitized, YOUTUBE_MAX_DESCRIPTION_BYTES);
  return { value, truncated: value.length < sanitized.length, originalBytes };
}

export function sanitizeYouTubeLocalizations(
  localizations: Record<string, YoutubeLocalization> | null | undefined,
): Record<string, YoutubeLocalization> | undefined {
  if (localizations == null) return undefined;

  return Object.fromEntries(
    Object.entries(localizations).map(([language, localization]) => {
      // Truncate by code point so emoji and surrogate pairs are never split.
      const title = Array.from(
        (localization?.title ?? "").replace(/[<>]/g, "").replace(/\n/g, " ").trim(),
      ).slice(0, YOUTUBE_MAX_TITLE_CHARS).join("");
      const description = localization?.description
        ? sanitizeYouTubeDescription(localization.description)
        : null;
      if (description?.truncated) {
        logger.warn("YouTube localized description truncated", {
          language,
          originalBytes: description.originalBytes,
          limitBytes: YOUTUBE_MAX_DESCRIPTION_BYTES,
        });
      }
      return [language, {
        ...(title ? { title } : {}),
        ...(description?.value ? { description: description.value } : {}),
      }];
    }),
  );
}

export class YouTubePostClient extends PostClient {
  #oauth2Client: any;
  #googleClientId: string;
  #googleClientSecret: string;

  static readonly MAX_PROCESSING_POLL_ATTEMPTS = 20;
  static readonly PROCESSING_POLL_INITIAL_DELAY_MS = 5_000;
  static readonly PROCESSING_POLL_MAX_DELAY_MS = 60_000;

  constructor(appCredentials: PlatformAppCredentials) {
    super(appCredentials);
    this.#googleClientId = appCredentials.app_id;
    this.#googleClientSecret = appCredentials.app_secret;
  }

  async refreshAccessToken(account: SocialAccount): Promise<RefreshTokenResult> {
    this.requests.push({ refreshRequest: "refreshing access token" });
    this.#oauth2Client = new google.auth.OAuth2(
      this.#googleClientId,
      this.#googleClientSecret,
      `${process.env.NEXTAUTH_URL}/api/youtube-auth/callback`,
    );
    this.#oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: new Date(account.access_token_expires_at!).getTime(),
    });
    const { credentials } = await this.#oauth2Client.refreshAccessToken();
    this.responses.push({
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

  async post({ postId, account, caption, media, platformConfig }: {
    postId: string;
    account: SocialAccount;
    caption: string;
    media: PostMedia[];
    platformConfig?: YoutubeConfiguration;
  }): Promise<PostResult> {
    let warning: string | null = null;
    try {
      const medium = media[0];
      if (medium.type !== "video") {
        throw new Error("Only videos are supported for YouTube posts");
      }
      const youtube = google.youtube({ version: "v3", auth: this.#oauth2Client }) as youtube_v3.Youtube;
      const description = sanitizeYouTubeDescription(platformConfig?.description || caption);
      if (description.truncated) {
        warning = `Description was truncated to ${YOUTUBE_MAX_DESCRIPTION_BYTES} bytes (was ${description.originalBytes})`;
        logger.warn("YouTube description truncated", {
          originalBytes: description.originalBytes,
          limitBytes: YOUTUBE_MAX_DESCRIPTION_BYTES,
        });
      }
      const parts = new Set(["snippet", "status"]);
      if (platformConfig?.localizations) parts.add("localizations");
      if (platformConfig?.recording_date) parts.add("recordingDetails");
      if (platformConfig?.has_paid_product_placement !== undefined) parts.add("paidProductPlacementDetails");
      const videoRequest = {
        part: [...parts],
        requestBody: {
          snippet: {
            title: this.#sanitizeYouTubeCaption(platformConfig?.title || caption),
            description: description.value,
            ...(platformConfig?.tags !== undefined && { tags: platformConfig.tags }),
            ...(platformConfig?.category_id !== undefined && { categoryId: platformConfig.category_id }),
            ...(platformConfig?.default_language !== undefined && { defaultLanguage: platformConfig.default_language }),
          },
          status: {
            privacyStatus: platformConfig?.privacy_status || "public",
            selfDeclaredMadeForKids: platformConfig?.made_for_kids == undefined ? false : platformConfig.made_for_kids,
            containsSyntheticMedia: platformConfig?.contains_synthetic_media === undefined ? false : platformConfig.contains_synthetic_media,
            ...(platformConfig?.embeddable !== undefined && { embeddable: platformConfig.embeddable }),
            ...(platformConfig?.license !== undefined && { license: platformConfig.license }),
            ...(platformConfig?.public_stats_viewable !== undefined && { publicStatsViewable: platformConfig.public_stats_viewable }),
            ...(platformConfig?.publish_at !== undefined && { publishAt: platformConfig.publish_at }),
          },
          ...(platformConfig?.localizations != null && { localizations: sanitizeYouTubeLocalizations(platformConfig.localizations) }),
          ...(platformConfig?.recording_date !== undefined && { recordingDetails: { recordingDate: platformConfig.recording_date } }),
          ...(platformConfig?.has_paid_product_placement !== undefined && { paidProductPlacementDetails: { hasPaidProductPlacement: platformConfig.has_paid_product_placement } }),
        },
      };
      const upload = await tasks.triggerAndWait<typeof uploadYoutubeVideo>("upload-youtube-video", {
        medium,
        videoRequest,
        oauth: {
          clientId: this.#googleClientId,
          clientSecret: this.#googleClientSecret,
          redirectUri: `${process.env.NEXTAUTH_URL}/api/youtube-auth/callback`,
          credentials: { ...this.#oauth2Client.credentials },
        },
      });
      if (!upload.ok) {
        const error = upload.error as { message?: string } | undefined;
        throw new Error(error?.message || "Failed to upload YouTube video", { cause: upload.error });
      }
      this.requests.push(...upload.output.requests);
      this.responses.push(...upload.output.responses);
      if (!upload.output.success) {
        throw upload.output.error;
      }
      const videoId = upload.output.video.id!;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log("Video uploaded. ID:", videoId, "URL:", videoUrl);

      // An explicit image URL takes precedence over timestamp extraction.
      if (medium.thumbnail_url) {
        try {
          await this.#uploadThumbnail(videoId, medium.thumbnail_url, { thumbnailUrl: medium.thumbnail_url });
        } catch (thumbnailError) {
          console.error("Failed to upload thumbnail:", thumbnailError);
        }
      } else if (medium.thumbnail_timestamp_ms != null) {
        try {
          await this.#uploadThumbnailFromTimestamp(videoId, medium);
        } catch (thumbnailError) {
          console.error("Failed to upload thumbnail from timestamp:", thumbnailError);
        }
      }
      const processingResult = await this.#pollProcessingDetails(youtube, videoId);
      if (!processingResult.success) {
        return {
          success: false,
          post_id: postId,
          provider_connection_id: account.id,
          provider_post_id: videoId,
          provider_post_url: videoUrl,
          error_message: processingResult.message,
          details: { warning, requests: this.requests, responses: this.responses },
        };
      }
      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: videoId,
        provider_post_url: videoUrl,
        details: { message: processingResult.message, warning, requests: this.requests, responses: this.responses },
      };
    } catch (error: any) {
      console.error("Error Posting to YouTube:", error);
      if (error.response) console.error("YouTube API error response:", error.response.data);
      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: `Failed to post to Youtube: ${error.message}`,
        details: {
          error: error?.response?.data || (error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack, cause: error.cause }
            : error),
          requests: this.requests,
          responses: this.responses,
        },
      };
    }
  }

  async #pollProcessingDetails(youtube: youtube_v3.Youtube, videoId: string): Promise<{ success: boolean; message?: string }> {
    for (let attempt = 1; attempt <= YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS; attempt += 1) {
      this.requests.push({ processingStatusPollRequest: { videoId, attempt } });
      console.log(`Polling YouTube processing status for video ${videoId} (attempt ${attempt}/${YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS})`);
      const response = await youtube.videos.list({ part: ["processingDetails", "status"], id: [videoId] });
      const video = response.data.items?.[0];
      const processingDetails = video?.processingDetails;
      const processingStatus = processingDetails?.processingStatus;
      this.responses.push({ processingStatusPollResponse: { attempt, videoId, processingStatus, processingDetails, videoStatus: video?.status } });
      console.log(`YouTube processing status for video ${videoId}: ${processingStatus}`);
      if (processingStatus === "succeeded") return { success: true };
      if (processingStatus === "failed" || processingStatus === "terminated") {
        const failureReason = processingDetails?.processingFailureReason;
        console.error(`YouTube video ${videoId} processing ${processingStatus}. processingFailureReason: ${failureReason}`);
        return { success: false, message: `YouTube video processing ${processingStatus}${failureReason ? `: ${failureReason}` : ""}` };
      }
      if (attempt < YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS) {
        const waitMs = Math.min(YouTubePostClient.PROCESSING_POLL_MAX_DELAY_MS, YouTubePostClient.PROCESSING_POLL_INITIAL_DELAY_MS * 2 ** (attempt - 1));
        console.log(`Video ${videoId} still processing (status: ${processingStatus}); waiting ${waitMs}ms before next poll`);
        this.responses.push({ processingStatusPollWait: { attempt, processingStatus, waitMs } });
        await wait.for({ seconds: waitMs / 1000 });
      }
    }
    console.warn(`Video ${videoId} still processing after ${YouTubePostClient.MAX_PROCESSING_POLL_ATTEMPTS} polling attempts; returning success with notice`);
    return { success: true, message: "Video is still processing, check YouTube for the status" };
  }

  #sanitizeYouTubeCaption(caption: string): string {
    const sanitized = caption.replace(/[<>]/g, "").replace(/\n/g, " ").trim();
    return sanitized.length === 0 ? "Untitled Video" : sanitized.slice(0, 100);
  }

  async #uploadThumbnailFromTimestamp(videoId: string, medium: PostMedia): Promise<void> {
    if (medium.thumbnail_timestamp_ms == null) return;
    const result = await tasks.triggerAndWait<typeof generateYoutubeTimestampThumbnail>(
      "generate-youtube-timestamp-thumbnail",
      { url: medium.url, timestampMs: medium.thumbnail_timestamp_ms, mediaId: medium.id },
    );
    if (!result.ok) throw new Error("Failed to generate YouTube timestamp thumbnail");
    await this.#uploadThumbnail(videoId, result.output, { thumbnailTimestampMs: medium.thumbnail_timestamp_ms });
  }

  async #uploadThumbnail(videoId: string, thumbnailUrl: string, source: { thumbnailUrl?: string; thumbnailTimestampMs?: number }): Promise<void> {
    const result = await tasks.triggerAndWait<typeof uploadYoutubeThumbnail>(
      "upload-youtube-thumbnail",
      {
        videoId,
        thumbnailUrl,
        source,
        oauth: {
          clientId: this.#googleClientId,
          clientSecret: this.#googleClientSecret,
          redirectUri: `${process.env.NEXTAUTH_URL}/api/youtube-auth/callback`,
          credentials: { ...this.#oauth2Client.credentials },
        },
      },
    );
    if (!result.ok) throw new Error("Failed to upload YouTube thumbnail");
    this.requests.push(result.output.request);
    this.responses.push(result.output.response);
    if (result.output.response.thumbnailError) throw new Error(result.output.response.thumbnailError.error);
  }
}
