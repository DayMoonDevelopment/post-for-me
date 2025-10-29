/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { SupabaseClient } from "@supabase/supabase-js";
import { PostClient } from "../post-client";
import axios from "axios";
import fetch from "node-fetch";
import {
  FacebookConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";
import { logger } from "@trigger.dev/sdk";
import FormData from "form-data";

export class FacebookPostClient extends PostClient {
  #requests: any[] = [];
  #responses: any[] = [];
  #appCredentials: PlatformAppCredentials;
  #completeStatuses = [
    "error",
    "expired",
    "ready",
    "upload_failed",
    "upload_complete",
  ];

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials
  ) {
    super(supabaseClient, appCredentials);
    this.#appCredentials = appCredentials;
  }

  async refreshAccessToken(
    account: SocialAccount
  ): Promise<RefreshTokenResult> {
    try {
      const refreshParams = {
        grant_type: "fb_exchange_token",
        client_id: this.#appCredentials.app_id,
        client_secret: this.#appCredentials.app_secret,
        fb_exchange_token: account.access_token,
      };
      this.#requests.push({
        refreshRequest: "https://graph.facebook.com/v20.0/oauth/access_token",
        params: refreshParams,
      });
      const response = await axios.get(
        "https://graph.facebook.com/v20.0/oauth/access_token",
        {
          params: refreshParams,
        }
      );
      this.#responses.push({ refreshResponse: response.data });

      if (!response.data.access_token) {
        console.error("Failed to refresh Facebook token", response.data);
        throw new Error("No access token in refresh response");
      }

      return {
        access_token: response.data.access_token,
        expires_at: new Date(
          Date.now() + 60 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };
    } catch (error) {
      console.error(
        "Error refreshing Facebook token:",
        error.response?.data || error
      );
      throw error;
    }
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
    platformConfig: FacebookConfiguration;
  }): Promise<PostResult> {
    try {
      let platformId;
      let platformUrl: string | undefined | null = undefined;

      switch (true) {
        case media.length === 0: {
          platformId = await this.#createTextPost({ account, caption });
          break;
        }
        case media.length === 1: {
          // For single media posts (image or video)
          const medium = media[0];

          if (medium.type === "video") {
            switch (platformConfig?.placement) {
              case "stories": {
                platformId = await this.#publishVideoStory({ account, medium });

                platformUrl = await this.#getStoryUrl({
                  platformId,
                  accessToken: account.access_token,
                });
                break;
              }
              case "reels": {
                platformId = await this.#publishReel({
                  account,
                  caption,
                  medium,
                  platformConfig,
                });

                platformUrl = `https://www.facebook.com/reel/${platformId}/`;
                break;
              }
              default: {
                platformId = await this.#publishVideo({
                  account,
                  caption,
                  medium,
                });

                if (medium.thumbnail_url) {
                  await this.#uploadThumbnail({
                    medium,
                    videoId: platformId,
                    accessToken: account.access_token,
                  });
                }

                platformUrl = `https://facebook.com/${account.social_provider_user_id}/videos/${platformId}`;

                break;
              }
            }
            break;
          }

          switch (platformConfig?.placement) {
            case "stories": {
              platformId = await this.#publishPhotoStory({
                account,
                caption,
                medium,
                platformConfig,
              });

              platformUrl = await this.#getStoryUrl({
                platformId,
                accessToken: account.access_token,
              });
              break;
            }
            default: {
              platformId = await this.#publishPhoto({
                account,
                caption,
                medium,
                platformConfig,
              });
              break;
            }
          }

          break;
        }
        case media.length > 1: {
          platformId = await this.#createCarouselPost({
            account,
            caption,
            media,
            platformConfig,
          });
          break;
        }
      }

      if (!platformUrl) {
        this.#requests.push({
          postRequest: {
            url: `https://graph.facebook.com/v20.0/${platformId}`,
            params: {
              fields: "permalink_url",
              access_token: account.access_token,
            },
          },
        });
        // Get the permalink URL for non-video posts
        const postResponse = await axios.get(
          `https://graph.facebook.com/v20.0/${platformId}`,
          {
            params: {
              fields: "permalink_url",
              access_token: account.access_token,
            },
          }
        );

        this.#responses.push({ postResponse: postResponse.data });
        platformUrl = postResponse.data.permalink_url;
      }

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: platformId,
        provider_post_url: platformUrl ?? "https://www.facebook.com/profile",
        details: {
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error) {
      console.error(
        "Error posting to Facebook:",
        error.response?.data || error
      );
      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        details: {
          error,
          requests: this.#requests,
          responses: this.#responses,
        },
        error_message: `Failed to post to Facebook ${
          error.response?.data?.error?.message || error.message
        }`,
      };
    }
  }

  async #createTextPost({
    account,
    caption,
  }: {
    account: SocialAccount;
    caption: string;
  }): Promise<string> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = Array.from(caption.matchAll(urlRegex));

    const postData: {
      message: string;
      access_token: string;
      published: boolean;
      link?: string;
      place?: string;
    } = {
      message: caption,
      access_token: account.access_token,
      published: true,
    };

    // If URL found, add it as a link parameter
    if (matches.length > 0) {
      // Clean up the URL (remove trailing punctuation)
      const link = matches[0][0].replace(/[.,;!?)]+$/, "");
      postData.link = link;
    }

    this.#requests.push({
      createTextRequest: {
        url: `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/feed`,
        body: postData,
      },
    });

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/feed`,
      postData
    );

    this.#responses.push({ createTextResponse: response.data });

    if (response.data.error) {
      throw new Error(`Failed to post: ${response.data.error.message}`);
    }
    return response.data.id;
  }

  async #publishPhoto({
    account,
    caption,
    medium,
    platformConfig,
  }: {
    account: SocialAccount;
    caption: string;
    medium: PostMedia;
    platformConfig: FacebookConfiguration;
  }): Promise<string> {
    const fileUrl = await this.getSignedUrlForFile(medium);
    const payload: {
      url: string;
      published: boolean;
      message: string;
      access_token: string;
      tags?: any[];
      place?: string;
    } = {
      url: fileUrl,
      published: true,
      message: caption,
      access_token: account.access_token,
    };

    if (medium.tags && medium.tags.length > 0) {
      payload.tags = medium.tags
        .filter((t) => t.platform === "facebook" && t.type == "user")
        .map((t) => ({
          x: t.x,
          y: t.y,
          tag_uid: t.id,
        }));
    }

    if (platformConfig?.location) {
      payload.place = platformConfig.location;
    }

    this.#requests.push({
      photoRequest: {
        url: `https://graph-video.facebook.com/v20.0/${account.social_provider_user_id}/photos`,
        data: payload,
      },
    });
    const photoResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/photos`,
      payload
    );

    this.#responses.push({ photoResponse: photoResponse.data });

    if (photoResponse.data.error) {
      throw new Error(
        `Failed to upload media: ${photoResponse.data.error.message}`
      );
    }

    return photoResponse.data.post_id || photoResponse.data.id;
  }

  async #createCarouselPost({
    account,
    caption,
    media,
    platformConfig,
  }: {
    account: SocialAccount;
    caption: string;
    media: PostMedia[];
    platformConfig: FacebookConfiguration;
  }): Promise<string> {
    const mediaIds = [];

    // Upload each image
    let index = 0;
    for (const medium of media) {
      if (medium.type == "video") {
        continue;
      }
      const fileUrl = await this.getSignedUrlForFile(medium);
      const payload: {
        url: string;
        message: string;
        published: boolean;
        access_token: string;
        tags?: any[];
      } = {
        url: fileUrl,
        message: caption,
        published: false,
        access_token: account.access_token,
      };

      if (medium.tags && medium.tags.length > 0) {
        payload.tags = medium.tags
          .filter((t) => t.platform === "facebook" && t.type == "user")
          .map((t) => ({
            x: t.x,
            y: t.y,
            tag_uid: t.id,
          }));
      }

      this.#requests.push({
        photoRequest: {
          url: `https://graph-video.facebook.com/v20.0/${account.social_provider_user_id}/photos`,
          data: payload,
        },
      });
      const photoResponse = await axios.post(
        `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/photos`,
        payload
      );

      this.#responses.push({ photoResponse: photoResponse.data });
      if (photoResponse.data.error) {
        throw new Error(
          `Failed to upload image: ${photoResponse.data.error.message}`
        );
      }
      mediaIds.push({ media_fbid: photoResponse.data.id });
      index++;
    }

    this.#requests.push({
      createCarouselPostRequest: {
        url: `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/feed`,
        body: {
          message: caption,
          access_token: account.access_token,
          attached_media: mediaIds,
        },
      },
    });

    const carouselBody: {
      message: string;
      access_token: string;
      attached_media: {
        media_fbid: any;
      }[];
      place?: string;
    } = {
      message: caption,
      access_token: account.access_token,
      attached_media: mediaIds,
    };

    if (platformConfig?.location) {
      carouselBody.place = platformConfig.location;
    }
    // Create the carousel post
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/feed`,
      {
        message: caption,
        access_token: account.access_token,
        attached_media: mediaIds,
      }
    );

    this.#responses.push({ createCarouselPostResponse: response.data });

    if (response.data.error) {
      throw new Error(
        `Failed to create carousel: ${response.data.error.message}`
      );
    }

    return response.data.id;
  }

  async #publishVideo({
    account,
    caption,
    medium,
  }: {
    account: SocialAccount;
    caption: string;
    medium: PostMedia;
  }): Promise<string> {
    const fileUrl = await this.getSignedUrlForFile(medium);
    this.#requests.push({
      videoRequest: {
        url: `https://graph-video.facebook.com/v20.0/${account.social_provider_user_id}/videos`,
        data: {
          file_url: fileUrl,
          description: caption,
          access_token: account.access_token,
        },
      },
    });
    const videoResponse = await axios.post(
      `https://graph-video.facebook.com/v20.0/${account.social_provider_user_id}/videos`,
      {
        file_url: fileUrl,
        description: caption,
        access_token: account.access_token,
      }
    );

    const videoResponseData = videoResponse.data;

    this.#responses.push({ videoResponse: videoResponseData });

    if (videoResponseData?.error) {
      console.error(videoResponseData);
      throw new Error(
        `Failed to publish video: ${videoResponseData.error.message}`
      );
    }

    let status = "processing";
    let statusResponse;
    let attempts = 0;
    const delay = 5000;
    const maxAttempts = 48;

    while (status === "processing" && attempts < maxAttempts) {
      this.#requests.push({
        statusRequest: {
          url: `https://graph.facebook.com/${videoResponseData.id}?fields=status`,
        },
      });
      statusResponse = await axios.get(
        `https://graph.facebook.com/${videoResponseData.id}?fields=status`,
        {
          headers: {
            Authorization: `OAuth ${account.access_token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );

      this.#responses.push({ statusResponse: statusResponse.data });

      status = statusResponse.data?.status?.video_status;
      attempts++;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (status === "error") {
      throw new Error(`Failed to process video`);
    }

    return videoResponseData.id;
  }

  async #publishVideoStory({
    account,
    medium,
  }: {
    account: SocialAccount;
    medium: PostMedia;
  }): Promise<string> {
    const uploadSessionResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/video_stories`,
      {
        upload_phase: "start",
        access_token: account.access_token,
      }
    );

    const uploadSessionResponseData = uploadSessionResponse.data;

    if (uploadSessionResponseData?.error) {
      console.error(uploadSessionResponseData);
      throw new Error(
        `Failed to create upload session: ${uploadSessionResponseData.error.message}`
      );
    }

    const fileUrl = await this.getSignedUrlForFile(medium);

    logger.info("Upload Started", { uploadSessionResponseData });
    const uploadVideoResponse = await axios.post(
      uploadSessionResponseData.upload_url,
      {},
      {
        headers: {
          Authorization: `OAuth ${account.access_token}`,
          file_url: fileUrl,
        },
      }
    );

    const uploadVideoResponseData = uploadVideoResponse.data;

    if (uploadVideoResponseData?.error) {
      console.error(uploadVideoResponseData);
      throw new Error(
        `Failed to upload video: ${uploadVideoResponseData.error.message}`
      );
    }

    let videoStatus = "processing";
    let videoStatusResponse;
    let vidoeAttempts = 0;
    const videoDelay = 5000;
    const videoMaxAttempts = 48;

    while (
      !this.#completeStatuses.includes(videoStatus) &&
      vidoeAttempts < videoMaxAttempts
    ) {
      videoStatusResponse = await axios.get(
        `https://graph.facebook.com/${uploadSessionResponseData.video_id}?fields=status`,
        {
          headers: {
            Authorization: `OAuth ${account.access_token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );

      videoStatus = videoStatusResponse.data?.status?.video_status;
      vidoeAttempts++;

      logger.info("Video processing wating", {
        data: videoStatusResponse.data,
        videoStatus,
        videoDelay,
        vidoeAttempts,
      });
      await new Promise((resolve) => setTimeout(resolve, videoDelay));
    }

    if (videoStatus === "error") {
      throw new Error(`Failed to process video`);
    }

    const createdMediaId = uploadSessionResponseData.video_id;

    const storyResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/video_stories`,
      {
        video_id: createdMediaId,
        upload_phase: "finish",
        access_token: account.access_token,
      }
    );

    const storyResponseData = storyResponse.data;

    logger.info("Story response", { storyResponseData });

    if (storyResponseData?.error) {
      throw new Error(
        `Failed to create story: ${storyResponseData.error.message}`
      );
    }

    let status = "processing";
    let statusResponse;
    let attempts = 0;
    const delay = 5000;
    const maxAttempts = 48;

    while (
      !["error", "completed", "complete"].includes(status) &&
      attempts < maxAttempts
    ) {
      try {
        statusResponse = await axios.get(
          `https://graph.facebook.com/${createdMediaId}?fields=status`,
          {
            headers: {
              Authorization: `OAuth ${account.access_token}`,
              "Content-Type": "application/json; charset=UTF-8",
            },
          }
        );

        status = statusResponse.data?.status?.processing_phase?.status;

        logger.info("Video processing wating", {
          data: statusResponse.data,
          status,
          delay,
          attempts,
        });
      } catch (err) {
        logger.error("Error getting video status", {
          err,
        });
      } finally {
        attempts++;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (status === "error") {
      const error = statusResponse?.data?.status?.processing_phase?.errors
        ?.map((error: { message?: string }) => error.message)
        .join(", ");
      throw new Error(`Failed to process video ${error}`);
    }

    return storyResponseData?.post_id;
  }

  async #publishPhotoStory({
    account,
    caption,
    medium,
    platformConfig,
  }: {
    account: SocialAccount;
    caption: string;
    medium: PostMedia;
    platformConfig: FacebookConfiguration;
  }): Promise<string> {
    const fileUrl = await this.getSignedUrlForFile(medium);
    const payload: {
      url: string;
      message: string;
      published: boolean;
      access_token: string;
      tags?: any[];
      place?: string;
    } = {
      url: fileUrl,
      message: caption,
      published: false,
      access_token: account.access_token,
    };

    if (medium.tags && medium.tags.length > 0) {
      payload.tags = medium.tags
        .filter((t) => t.platform === "facebook" && t.type == "user")
        .map((t) => ({
          x: t.x,
          y: t.y,
          tag_uid: t.id,
        }));
    }

    if (platformConfig?.location) {
      payload.place = platformConfig.location;
    }

    this.#requests.push({
      photoRequest: {
        url: `https://graph-video.facebook.com/v20.0/${account.social_provider_user_id}/photos`,
        data: payload,
      },
    });
    const photoResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/photos`,
      payload
    );

    this.#responses.push({ photoResponse: photoResponse.data });
    if (photoResponse.data.error) {
      throw new Error(
        `Failed to upload image: ${photoResponse.data.error.message}`
      );
    }

    const createdMediaId = photoResponse.data.id;

    const storyResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/photo_stories`,
      {
        photo_id: createdMediaId,
        access_token: account.access_token,
      }
    );

    const storyResponseData = storyResponse.data;

    logger.info("Story response", { storyResponseData });

    if (storyResponseData?.error) {
      throw new Error(
        `Failed to create story: ${storyResponseData.error.message}`
      );
    }

    return storyResponseData?.post_id;
  }

  async #getStoryUrl({
    platformId,
    accessToken,
  }: {
    platformId: string;
    accessToken: string;
  }): Promise<string | undefined> {
    const postResponse = await axios.get(
      `https://graph.facebook.com/v20.0/${platformId}?fields=url&access_token=${accessToken}`
    );

    const postResponseData = postResponse.data as {
      url: string;
    };

    return postResponseData?.url;
  }

  async #publishReel({
    account,
    caption,
    medium,
    platformConfig,
  }: {
    account: SocialAccount;
    medium: PostMedia;
    caption: string;
    platformConfig: FacebookConfiguration;
  }) {
    const uploadSessionResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/video_reels`,
      {
        upload_phase: "start",
        access_token: account.access_token,
      }
    );

    const uploadSessionResponseData = uploadSessionResponse.data;

    if (uploadSessionResponseData?.error) {
      console.error(uploadSessionResponseData);
      throw new Error(
        `Failed to create upload session: ${uploadSessionResponseData.error.message}`
      );
    }

    const fileUrl = await this.getSignedUrlForFile(medium);

    logger.info("Upload Started", { uploadSessionResponseData });
    const uploadVideoResponse = await axios.post(
      uploadSessionResponseData.upload_url,
      null,
      {
        headers: {
          Authorization: `OAuth ${account.access_token}`,
          file_url: fileUrl,
        },
      }
    );

    const uploadVideoResponseData = uploadVideoResponse.data;

    if (uploadVideoResponseData?.error) {
      console.error(uploadVideoResponseData);
      throw new Error(
        `Failed to upload video: ${uploadVideoResponseData.error.message}`
      );
    }

    let videoStatus = "processing";
    let videoStatusResponse;
    let vidoeAttempts = 0;
    const videoDelay = 5000;
    const videoMaxAttempts = 48;

    while (
      !this.#completeStatuses.includes(videoStatus) &&
      vidoeAttempts < videoMaxAttempts
    ) {
      videoStatusResponse = await axios.get(
        `https://graph.facebook.com/${uploadSessionResponseData.video_id}?fields=status`,
        {
          headers: {
            Authorization: `OAuth ${account.access_token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );

      videoStatus = videoStatusResponse.data?.status?.video_status;
      vidoeAttempts++;

      logger.info("Video processing wating", {
        data: videoStatusResponse.data,
        videoStatus,
        videoDelay,
        vidoeAttempts,
      });
      await new Promise((resolve) => setTimeout(resolve, videoDelay));
    }

    if (videoStatus === "error") {
      throw new Error(`Failed to process video`);
    }

    const createdMediaId = uploadSessionResponseData.video_id;

    if (medium.thumbnail_url) {
      await this.#uploadThumbnail({
        medium,
        videoId: createdMediaId,
        accessToken: account.access_token,
      });
    }

    const reelBody: {
      video_id: string;
      upload_phase: string;
      video_state: string;
      description: string;
      access_token: string;
      place?: string;
    } = {
      video_id: createdMediaId,
      upload_phase: "finish",
      video_state: "PUBLISHED",
      description: caption,
      access_token: account.access_token,
    };

    if (platformConfig?.location) {
      reelBody.place = platformConfig.location;
    }

    const reelResponse = await axios.post(
      `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/video_reels`,
      reelBody
    );

    const reelResponseData = reelResponse.data;

    logger.info("Reel response", { storyResponseData: reelResponseData });

    if (reelResponseData?.error) {
      throw new Error(
        `Failed to create reel: ${reelResponseData.error.message}`
      );
    }

    let status = "processing";
    let statusResponse;
    let attempts = 0;
    const delay = 5000;
    const maxAttempts = 48;

    while (
      !["error", "completed", "complete"].includes(status) &&
      attempts < maxAttempts
    ) {
      try {
        statusResponse = await axios.get(
          `https://graph.facebook.com/${createdMediaId}?fields=status`,
          {
            headers: {
              Authorization: `OAuth ${account.access_token}`,
              "Content-Type": "application/json; charset=UTF-8",
            },
          }
        );

        status = statusResponse.data?.status?.processing_phase?.status;

        logger.info("Video processing wating", {
          data: statusResponse.data,
          status,
          delay,
          attempts,
        });
      } catch (err) {
        logger.error("Error getting video status", {
          err,
        });
      } finally {
        attempts++;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (status === "error") {
      const error = statusResponse?.data?.status?.processing_phase?.errors
        ?.map((error: { message?: string }) => error.message)
        .join(", ");
      throw new Error(`Failed to process video ${error}`);
    }

    if (platformConfig?.collaborators) {
      logger.info("Adding collaborators");
      for (const collaborator of platformConfig.collaborators) {
        try {
          const collaboratorResponse = await axios.post(
            `https://graph.facebook.com/v20.0/${createdMediaId}/collaborators`,
            {
              target_id: collaborator,
              access_token: account.access_token,
            }
          );

          logger.info("Added collaborator", {
            data: collaboratorResponse.data,
          });
        } catch (err) {
          logger.error("Error adding collaborator", { error: err });
        }
      }
    }

    return createdMediaId;
  }

  async #uploadThumbnail({
    medium,
    videoId,
    accessToken,
  }: {
    medium: PostMedia;
    videoId: string;
    accessToken: string;
  }) {
    if (!medium.thumbnail_url) {
      return;
    }

    const file = await this.getFile({
      type: medium.type,
      url: medium.thumbnail_url,
    });
    const form = new FormData();
    form.append("access_token", accessToken);
    form.append("is_preferred", "true");

    const buffer = await file.arrayBuffer();
    form.append("source", buffer, {
      filename: file.name,
      contentType: file.type,
    });

    await fetch(`https://graph.facebook.com/v20.0/${videoId}/thumbnails`, {
      method: "POST",
      body: form,
      headers: {
        ...form.getHeaders(),
      },
    });
  }
}
