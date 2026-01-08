/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { PostClient } from "../post-client";
import axios, { AxiosResponse } from "axios";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  SocialAccount,
  PostMedia,
  ThreadsConfiguration,
  PostResult,
  PlatformAppCredentials,
} from "../post.types";

interface TokenRefreshResult {
  access_token: string;
  expires_at: string;
}

interface ContainerStatusResponse {
  status: "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED";
  error_message?: string;
}

interface ThreadsPostParams {
  postId: string;
  account: SocialAccount;
  caption: string;
  media: PostMedia[];
  platformConfig: ThreadsConfiguration;
}

export class ThreadsPostClient extends PostClient {
  #maxItems = 4;
  #containerUrl = "https://graph.threads.net/v1.0/me/threads";
  #requests: any[] = [];
  #responses: any[] = [];

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials,
  ) {
    super(supabaseClient, appCredentials);
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<TokenRefreshResult> {
    this.#requests.push({
      refreshRequest: "https://graph.threads.net/refresh_access_token",
    });

    const refreshResponse: AxiosResponse<{
      access_token: string;
      expires_in: number;
    }> = await axios.get("https://graph.threads.net/refresh_access_token", {
      params: {
        grant_type: "th_refresh_token",
        access_token: account.access_token,
      },
    });

    this.#responses.push({ refreshResponse: refreshResponse.data });

    const { access_token, expires_in } = refreshResponse.data;
    const newExpirationDate = new Date(Date.now() + expires_in * 1000);

    newExpirationDate.setSeconds(newExpirationDate.getSeconds() - 300);

    return {
      access_token,
      expires_at: newExpirationDate.toISOString(),
    };
  }

  async post({
    postId,
    account,
    caption,
    media,
    platformConfig,
  }: ThreadsPostParams): Promise<PostResult> {
    try {
      const allowedCaption = caption.slice(0, 500);

      let containerId: string | null = null;

      switch (true) {
        case media.length == 0: {
          containerId = await this.#processText(account, allowedCaption);
          break;
        }
        case media.length == 1: {
          containerId = await this.#processMedia(
            account,
            media,
            platformConfig?.location,
            allowedCaption,
          );
          break;
        }
        case media.length > 1: {
          containerId = await this.#processCarousel(
            account,
            media,
            allowedCaption,
          );
          break;
        }
      }

      if (!containerId) {
        throw new Error("Failed to create container");
      }

      let platformId: string | null = null;
      const maxPublishAttempts = 10;
      let publishAttempts = 0;
      while (!platformId && publishAttempts < maxPublishAttempts) {
        try {
          console.log(`Publish attempt #${publishAttempts + 1}`);
          this.#requests.push({
            postRequest: {
              url: `https://graph.threads.net/v1.0/me/threads_publish`,
              params: {
                creation_id: containerId,
                access_token: account.access_token,
              },
            },
          });

          const publishResponse: AxiosResponse<{ id: string }> =
            await axios.post(
              `https://graph.threads.net/v1.0/me/threads_publish`,
              null,
              {
                params: {
                  creation_id: containerId,
                  access_token: account.access_token,
                },
              },
            );

          this.#responses.push({ publishResponse: publishResponse.data });

          platformId = publishResponse.data.id;
        } catch (error: any) {
          if (error.response?.status === 400) {
            console.log(
              `Bad Request With Error: ${error.response?.data?.error?.message || "Unknown error"}`,
            );
            console.log("Waiting 5 secs");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }

          throw error;
        } finally {
          publishAttempts++;
        }
      }

      if (!platformId) {
        throw new Error(
          "Unknown Error: Unable to publish media, please try again.",
        );
      }

      const platformUrl = await this.#getPostUrl(account, platformId);
      return {
        success: true,
        provider_connection_id: account.id,
        post_id: postId,
        provider_post_id: platformId,
        provider_post_url: platformUrl,
        details: {
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error: any) {
      console.error("Error posting to Threads:", error.response?.data || error);

      // Handle specific error cases
      if (error.response?.status === 401) {
        return {
          success: false,
          provider_connection_id: account.id,
          post_id: postId,
          error_message: "Account needs to be reconnected",
          details: {
            error,
            requests: this.#requests,
            responses: this.#responses,
          },
        };
      }

      return {
        success: false,
        provider_connection_id: account.id,
        post_id: postId,
        error_message: "Failed to post to Threads",
        details: {
          error: error.response?.data || error.message,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    }
  }

  async #processText(
    account: SocialAccount,
    caption: string,
  ): Promise<string | null> {
    this.#requests.push({
      createContainerRequest: {
        url: this.#containerUrl,
        params: {
          media_type: "TEXT",
          text: caption,
        },
      },
    });

    const createContainerResponse: AxiosResponse<{ id: string }> =
      await axios.post(
        this.#containerUrl,
        {
          media_type: "TEXT",
          text: caption,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        },
      );

    this.#responses.push({
      createContainerResponse: createContainerResponse.data,
    });

    const conatinerId = createContainerResponse?.data?.id || null;

    // Simple delay to ensure container is processed
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return conatinerId;
  }

  async #processMedia(
    account: SocialAccount,
    media: PostMedia[],
    location?: string,
    caption?: string,
  ): Promise<string | null> {
    const medium = media[0];
    const signedUrl = await this.getSignedUrlForFile(medium);
    const isVideo = medium.type === "video";

    this.#requests.push({
      createContainerRequest: {
        url: this.#containerUrl,
        params: {
          media_type:
            isVideo && location == "reels"
              ? "REELS"
              : isVideo
                ? "VIDEO"
                : "IMAGE",
          [isVideo ? "video_url" : "image_url"]: signedUrl,
          text: caption,
        },
      },
    });

    const createContainerResponse: AxiosResponse<{ id: string }> =
      await axios.post(
        this.#containerUrl,
        {
          media_type:
            isVideo && location == "reels"
              ? "REELS"
              : isVideo
                ? "VIDEO"
                : "IMAGE",
          [isVideo ? "video_url" : "image_url"]: signedUrl,
          text: caption,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        },
      );

    this.#responses.push({
      createContainerResponse: createContainerResponse.data,
    });

    const containerId = createContainerResponse.data.id;

    // Step 2: Check container status until ready
    let status: string = "IN_PROGRESS";
    let attempts = 0;
    const maxStatusChecks = 10; // 5 minutes with 10-second intervals

    while (attempts < maxStatusChecks) {
      try {
        this.#requests.push({
          checkContainerStatusRequest: {
            url: `https://graph.threads.net/v1.0/${containerId}`,
            params: {
              fields: "status,error_message",
              access_token: account.access_token,
            },
          },
        });

        const statusResponse: AxiosResponse<ContainerStatusResponse> =
          await axios.get(`https://graph.threads.net/v1.0/${containerId}`, {
            params: {
              fields: "status,error_message",
              access_token: account.access_token,
            },
          });

        this.#responses.push({
          checkContainerStatusResponse: statusResponse.data,
        });

        status = statusResponse.data.status;

        switch (status) {
          case "FINISHED":
            return containerId;
          case "ERROR":
            throw new Error(
              `Container processing failed: ${
                statusResponse.data.error_message || "Unknown error"
              }`,
            );
          case "EXPIRED":
            throw new Error("Container expired before publishing");
          default:
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10-second interval
        attempts++;
      } catch (error: any) {
        if (error.response?.status === 400) {
          // If we get a 400 error, the media might be ready
          break;
        }
        throw error;
      }
    }

    if (status !== "FINISHED" && attempts >= maxStatusChecks) {
      throw new Error("Container processing timed out");
    }

    return containerId;
  }

  async #processCarousel(
    account: SocialAccount,
    media: PostMedia[],
    caption: string,
  ): Promise<string | null> {
    const containerIds: string[] = [];
    const allowedMedia = media.slice(0, this.#maxItems);

    for (const medium of allowedMedia) {
      const signedUrl = await this.getSignedUrlForFile(medium);
      const isVideo = medium.type === "video";

      this.#requests.push({
        carouselItemRequest: {
          url: this.#containerUrl,
          params: {
            media_type: isVideo ? "VIDEO" : "IMAGE",
            [isVideo ? "video_url" : "image_url"]: signedUrl,
            is_carousel_item: true,
          },
        },
      });

      // Create item container
      const itemResponse: AxiosResponse<{ id: string }> = await axios.post(
        this.#containerUrl,
        {
          media_type: isVideo ? "VIDEO" : "IMAGE",
          [isVideo ? "video_url" : "image_url"]: signedUrl,
          is_carousel_item: true,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        },
      );

      this.#responses.push({
        carouselItemResponse: itemResponse.data,
      });

      const containerId = itemResponse.data.id;
      containerIds.push(containerId);

      // Wait for item processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.#requests.push({
      createCarouselRequest: {
        url: this.#containerUrl,
        params: {
          media_type: "CAROUSEL",
          children: containerIds.join(","),
          text: caption,
        },
      },
    });

    // Step 2: Create carousel container
    const carouselResponse: AxiosResponse<{ id: string }> = await axios.post(
      this.#containerUrl,
      {
        media_type: "CAROUSEL",
        children: containerIds.join(","),
        text: caption,
      },
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      },
    );

    this.#responses.push({
      createCarouselResponse: carouselResponse.data,
    });

    const carouselContainerId = carouselResponse.data.id;

    // Wait for carousel processing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return carouselContainerId;
  }

  async #getPostUrl(account: SocialAccount, postId: string): Promise<string> {
    // After successful publish, fetch the media object to get the permalink
    this.#requests.push({
      getPostUrlRequest: { url: `https://graph.threads.net/v1.0/${postId}` },
    });

    const mediaResponse: AxiosResponse<{
      permalink: string;
      error?: { message: string };
    }> = await axios.get(`https://graph.threads.net/v1.0/${postId}`, {
      params: {
        fields: "permalink",
        access_token: account.access_token,
      },
    });

    this.#responses.push({ getPostUrlResponse: mediaResponse.data });

    if (mediaResponse.data.error) {
      throw new Error(
        `Failed to fetch media details: ${mediaResponse.data.error.message}`,
      );
    }

    return mediaResponse.data.permalink;
  }
}
