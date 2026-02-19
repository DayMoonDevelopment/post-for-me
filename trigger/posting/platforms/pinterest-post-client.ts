/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { PostClient } from "../post-client";
import axios from "axios";
import FormData from "form-data";
import {
  PinterestConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";
import { SupabaseClient } from "@supabase/supabase-js";

export class PinterestPostClient extends PostClient {
  #requests: any[] = [];
  #responses: any[] = [];
  #appCredentials: PlatformAppCredentials;
  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials,
  ) {
    super(supabaseClient, appCredentials);
    this.#appCredentials = appCredentials;
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    // Create Basic Auth header
    const credentials = Buffer.from(
      `${this.#appCredentials.app_id}:${this.#appCredentials.app_secret}`,
    ).toString("base64");

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token || "",
    });

    let requestUrl = "https://api.pinterest.com/v5/oauth/token";
    if (account.social_provider_metadata?.is_sandbox) {
      requestUrl = "https://api-sandbox.pinterest.com/v5/oauth/token";
    }

    this.#requests.push({
      refreshRequest: requestUrl,
      params,
    });

    const refreshResponse = await axios.post(requestUrl, params.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    this.#responses.push({ refreshResponse: refreshResponse.data });

    const { access_token, expires_in, refresh_token } = refreshResponse.data;
    const newExpirationDate = new Date(Date.now() + expires_in * 1000);

    return {
      access_token,
      refresh_token,
      expires_at: newExpirationDate.toISOString(),
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
    platformConfig: PinterestConfiguration;
  }): Promise<PostResult> {
    try {
      if (media.length == 0) {
        throw new Error("No files to post");
      }

      const medium = media[0];
      const isVideo = medium.type === "video";

      let boardId = platformConfig?.board_ids?.[0];
      if (!boardId) {
        boardId = await this.#getOrCreateBoardId(account);
      }

      let mediaSource = {};
      if (isVideo) {
        mediaSource = await this.#getVideoMediaSource({
          account,
          medium,
          coverImageTimestamp: medium.thumbnail_timestamp_ms || undefined,
        });
      } else {
        mediaSource = {
          source_type: "image_url",
          url: await this.getSignedUrlForFile(medium),
        };
      }

      // Create the pin
      const pinData = {
        board_id: boardId,
        title: caption.slice(0, 100),
        link: platformConfig?.link,
        description: caption.slice(0, 800),
        media_source: mediaSource,
      };

      this.#requests.push({ postRequest: pinData });

      let publishUrl = "https://api.pinterest.com/v5/pins";
      if (account.social_provider_metadata?.is_sandbox) {
        publishUrl = "https://api-sandbox.pinterest.com/v5/pins";
      }

      const response = await axios.post(publishUrl, pinData, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
      });

      this.#responses.push({ postResponse: response.data });

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: response.data.id,
        provider_post_url: `https://pinterest.com/pin/${response.data.id}`,
        details: {
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error) {
      console.error("Error posting to Pinterest:", error);
      console.error("Error details:", error.response?.data || error.message);
      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: "Failed to post to Pinterest",
        details: {
          error: error.response?.data || error.message,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    }
  }

  async #getOrCreateBoardId(account: SocialAccount): Promise<string> {
    let boardsUrl = "https://api.pinterest.com/v5/boards";
    if (account.social_provider_metadata?.is_sandbox) {
      boardsUrl = "https://api-sandbox.pinterest.com/v5/boards";
    }

    this.#requests.push({
      getBoardsRequest: boardsUrl,
    });
    const boardsResponse = await axios.get(boardsUrl, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
    });
    this.#responses.push({ getBoardsResponse: boardsResponse.data });

    if (boardsResponse.data.items && boardsResponse.data.items.length > 0) {
      return boardsResponse.data.items[0].id;
    }

    const createBoardParams = {
      name: "Post For Me",
      description: "Posts from Post For Me",
    };
    this.#requests.push({
      createBoardRequest: {
        url: boardsUrl,
        params: createBoardParams,
      },
    });
    const createBoardResponse = await axios.post(boardsUrl, createBoardParams, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
    });

    this.#responses.push({ createBoardResponse: createBoardResponse.data });

    return createBoardResponse.data.id;
  }

  async #getVideoMediaSource({
    account,
    medium,
    coverImageTimestamp,
  }: {
    account: SocialAccount;
    medium: PostMedia;
    coverImageTimestamp: number | undefined;
  }) {
    let mediaUrl = "https://api.pinterest.com/v5/media";
    if (account.social_provider_metadata?.is_sandbox) {
      mediaUrl = "https://api-sandbox.pinterest.com/v5/media";
    }

    this.#requests.push({
      registerMediaRequest: mediaUrl,
    });
    // Step 1: Register media with Pinterest
    const registerMediaResponse = await axios.post(
      mediaUrl,
      {
        media_type: "video",
      },
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    this.#responses.push({ registerMediaResponse: registerMediaResponse.data });

    const mediaId = registerMediaResponse.data.media_id;
    const { upload_url, upload_parameters } = registerMediaResponse.data;

    const fileUrl = await this.getSignedUrlForFile(medium);
    const fileResponse = await axios.get(fileUrl, {
      responseType: "stream",
    });
    const filename =
      new URL(fileUrl).pathname.split("/").pop() || `video_${mediaId}.mp4`;
    const contentType = fileResponse.headers["content-type"] || "video/mp4";
    const knownLengthRaw = fileResponse.headers["content-length"];
    const knownLength = knownLengthRaw ? Number(knownLengthRaw) : undefined;

    // Create form data
    const form = new FormData();

    // Add Content-Type first
    form.append("Content-Type", "multipart/form-data");

    // Then add all other AWS parameters
    Object.entries(upload_parameters).forEach(([key, value]) => {
      if (key !== "Content-Type") {
        form.append(key, value);
      }
    });

    // Add the file last
    form.append("file", fileResponse.data, {
      filename,
      contentType,
      ...(Number.isFinite(knownLength as number) && (knownLength as number) > 0
        ? { knownLength: knownLength as number }
        : {}),
    });

    this.#requests.push({ uploadRequest: { file: medium } });

    const headers: Record<string, string> = {
      ...(form.getHeaders() as Record<string, string>),
    };

    // Best-effort Content-Length (helps some S3-compatible endpoints).
    try {
      const formLength = await new Promise<number>((resolve, reject) => {
        form.getLength((err, length) => {
          if (err) reject(err);
          else resolve(length);
        });
      });
      headers["Content-Length"] = String(formLength);
    } catch {
      // ignore
    }

    const uploadResponse = await axios.post(upload_url, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    this.#responses.push({ uploadResponse: uploadResponse.status });

    if (uploadResponse.status !== 204) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    // Step 3: Check media status with exponential backoff
    let mediaStatus;
    let attempts = 0;
    const maxAttempts = 20;
    let delay = 4000;

    while (attempts < maxAttempts) {
      this.#requests.push({
        checkMediaStatusRequest: `${mediaUrl}/${mediaId}`,
      });
      const statusResponse = await axios.get(`${mediaUrl}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      });

      this.#responses.push({ checkMediaStatusResponse: statusResponse.data });

      mediaStatus = statusResponse.data.status;

      if (mediaStatus === "succeeded") {
        break;
      } else if (mediaStatus === "failed") {
        throw new Error("Media processing failed");
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.2;
      attempts++;
    }

    const mediaSource: any = {
      source_type: "video_id",
      media_id: mediaId,
    };

    // Add custom cover image if provided, otherwise use timestamp
    if (medium.thumbnail_url) {
      mediaSource.cover_image_url = medium.thumbnail_url;
    } else {
      mediaSource.cover_image_key_frame_time = Math.round(
        (coverImageTimestamp || 0) / 1000,
      );
    }

    return mediaSource;
  }
}
