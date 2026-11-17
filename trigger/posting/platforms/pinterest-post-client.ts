import { PostClient } from "../post-client";
import axios from "axios";
import { tasks, wait } from "@trigger.dev/sdk";
import type { uploadPinterestVideo } from "../../upload-pinterest-video";
import {
  PinterestConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";

export class PinterestPostClient extends PostClient {
  #appCredentials: PlatformAppCredentials;
  constructor(appCredentials: PlatformAppCredentials) {
    super(appCredentials);
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

    this.requests.push({
      refreshRequest: requestUrl,
      params,
    });

    const refreshResponse = await axios.post(requestUrl, params.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    this.responses.push({ refreshResponse: refreshResponse.data });

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
      const pinTitle = platformConfig?.title?.trim() || caption;
      const pinData: {
        board_id: string;
        title: string;
        link?: string;
        description: string;
        media_source: typeof mediaSource;
        alt_text?: string;
      } = {
        board_id: boardId,
        title: pinTitle.slice(0, 100),
        link: platformConfig?.link,
        description: caption.slice(0, 800),
        media_source: mediaSource,
      };

      if (medium.alt_text) {
        pinData.alt_text = medium.alt_text.slice(0, 500);
      }

      this.requests.push({ postRequest: pinData });

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

      this.responses.push({ postResponse: response.data });

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: response.data.id,
        provider_post_url: `https://pinterest.com/pin/${response.data.id}`,
        details: {
          requests: this.requests,
          responses: this.responses,
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
          requests: this.requests,
          responses: this.responses,
        },
      };
    }
  }

  async #getOrCreateBoardId(account: SocialAccount): Promise<string> {
    let boardsUrl = "https://api.pinterest.com/v5/boards";
    if (account.social_provider_metadata?.is_sandbox) {
      boardsUrl = "https://api-sandbox.pinterest.com/v5/boards";
    }

    this.requests.push({
      getBoardsRequest: boardsUrl,
    });
    const boardsResponse = await axios.get(boardsUrl, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
    });
    this.responses.push({ getBoardsResponse: boardsResponse.data });

    if (boardsResponse.data.items && boardsResponse.data.items.length > 0) {
      return boardsResponse.data.items[0].id;
    }

    const createBoardParams = {
      name: "Post For Me",
      description: "Posts from Post For Me",
    };
    this.requests.push({
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

    this.responses.push({ createBoardResponse: createBoardResponse.data });

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

    const result = await tasks.triggerAndWait<typeof uploadPinterestVideo>(
      "upload-pinterest-video", { medium, accessToken: account.access_token, mediaUrl },
    );
    if (!result.ok) {
      const error = result.error as { message?: string };
      throw new Error(error?.message || "Failed to upload Pinterest video", { cause: result.error });
    }
    this.requests.push(...result.output.requests);
    this.responses.push(...result.output.responses);
    if (!result.output.success) {
      throw Object.assign(new Error(result.output.message), { response: { data: result.output.error } });
    }
    const { mediaId } = result.output;

    // Step 3: Check media status with exponential backoff
    let mediaStatus;
    let attempts = 0;
    const maxAttempts = 20;
    let delay = 4000;

    while (attempts < maxAttempts) {
      this.requests.push({
        checkMediaStatusRequest: `${mediaUrl}/${mediaId}`,
      });
      const statusResponse = await axios.get(`${mediaUrl}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      });

      this.responses.push({ checkMediaStatusResponse: statusResponse.data });

      mediaStatus = statusResponse.data.status;

      if (mediaStatus === "succeeded") {
        break;
      } else if (mediaStatus === "failed") {
        throw new Error("Media processing failed");
      }

      await wait.for({ seconds: delay / 1000 });
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
