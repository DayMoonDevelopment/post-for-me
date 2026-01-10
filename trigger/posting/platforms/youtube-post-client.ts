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

      const fileBuffer = await file.arrayBuffer();
      const fileStream = new Readable();
      fileStream.push(Buffer.from(fileBuffer));
      fileStream.push(null);

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
        },
      });

      const res = await youtube.videos.insert({
        ...videoRequest,
        media: {
          body: fileStream,
        },
      });

      this.#responses.push({ postResponse: res });

      const videoId = res.data.id;
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
    medium: PostMedia
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
