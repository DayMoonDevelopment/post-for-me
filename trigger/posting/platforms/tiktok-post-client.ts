/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { SupabaseClient } from "@supabase/supabase-js";
import { PostClient } from "../post-client";
import axios from "axios";
import sharp from "sharp";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
  TiktokConfiguration,
} from "../post.types";

export class TikTokPostClient extends PostClient {
  #tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
  #processingStatuses = ["PROCESSING", "PROCESSING_DOWNLOAD"];
  #processedStatuses = ["PUBLISH_COMPLETE", "PUBLISH_SUCCESS"];
  #maxItems = 32;
  #titleLength = 85;
  #clientKey: string;
  #clientSecret: string;
  #localSupabaseClient;
  #maxFileSize = 20 * 1024 * 1024;
  #addedMedia: any[] = [];
  #requests: any[] = [];
  #responses: any[] = [];
  #bucket: string = "post-media";

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials
  ) {
    super(supabaseClient, appCredentials);

    this.#clientKey = appCredentials.app_id;
    this.#clientSecret = appCredentials.app_secret;

    this.#localSupabaseClient = supabaseClient;
  }

  async refreshAccessToken(
    account: SocialAccount
  ): Promise<RefreshTokenResult> {
    const formData = new URLSearchParams();
    formData.append("client_key", this.#clientKey);
    formData.append("client_secret", this.#clientSecret);
    formData.append("grant_type", "refresh_token");
    formData.append("refresh_token", account.refresh_token!);

    this.#requests.push({ refreshRequest: { url: this.#tokenUrl } });
    const refreshResponse = await axios.post(this.#tokenUrl, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
    });

    this.#responses.push({ refreshResponse: refreshResponse.data });

    if (refreshResponse.data.error) {
      throw new Error(
        `TikTok API error: ${
          refreshResponse.data.error_description || refreshResponse.data.error
        }`
      );
    }

    const now = new Date();
    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    const newExpirationDate = new Date(now.getTime() + expires_in * 1000);

    //Set expiration so it refreshes two days early
    newExpirationDate.setDate(newExpirationDate.getDate() - 2);

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
    platformConfig: TiktokConfiguration;
  }): Promise<PostResult> {
    try {
      if (media.length === 0) {
        return {
          post_id: postId,
          provider_connection_id: account.id,
          success: false,
          error_message: "No files provided",
        };
      }

      const creatorInfoResponse = await this.#getCreatorInfo(account);

      const medium = media[0];
      const isVideo = medium.type === "video";

      let publishId;
      if (isVideo) {
        //Only one video is allowed
        publishId = await this.#processVideo({
          medium,
          caption,
          coverTimestamp: medium.thumbnail_timestamp_ms || undefined,
          account,
          platformData: platformConfig,
        });
      } else {
        publishId = await this.#processImages({
          media,
          caption,
          title: platformConfig?.title,
          account,
          platformData: platformConfig,
        });
      }

      if (platformConfig?.is_draft) {
        return {
          success: true,
          post_id: postId,
          provider_connection_id: account.id,
          details: {
            status: "Saved as draft",
            message:
              "Content saved as draft in TikTok. Check your TikTok inbox notifications to continue editing and publish.",
            addedMedia: this.#addedMedia,
            requests: this.#requests,
            responses: this.#responses,
            username: creatorInfoResponse.data.data.creator_username,
          },
          provider_post_url: `https://www.tiktok.com/@${creatorInfoResponse.data.data.creator_username}`,
          provider_post_id: publishId,
        };
      }

      const status = await this.#getPublishStatus({ publishId, account });

      if (this.#processingStatuses.includes(status)) {
        return {
          success: true,
          post_id: postId,
          provider_connection_id: account.id,
          details: {
            status: "Processing",
            message: "Still Proccessing, not published yet",
            addedMedia: this.#addedMedia,
            requests: this.#requests,
            responses: this.#responses,
            username: creatorInfoResponse.data.data.creator_username,
          },
          provider_post_url: `https://www.tiktok.com/@${creatorInfoResponse.data.data.creator_username}`,
          provider_post_id: publishId,
        };
      }

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: publishId,
        details: {
          status: "Published successfully",
          addedMedia: this.#addedMedia,
          requests: this.#requests,
          responses: this.#responses,
          username: creatorInfoResponse.data.data.creator_username,
        },
        provider_post_url: `https://www.tiktok.com/@${creatorInfoResponse.data.data.creator_username}`,
      };
    } catch (error) {
      console.error("Error in postToTikTok:", error.message);
      const errorDetails = await this.#getErrorDetails(error);

      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: "Failed to post to TikTok",
        details: {
          error: errorDetails,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    }
  }

  async #getCreatorInfo(account: SocialAccount) {
    this.#requests.push({
      creatorRequest:
        "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    });

    const response = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {},
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    this.#responses.push({ creatorResponse: response.data });

    return response;
  }

  async #getPublishStatus({
    publishId,
    account,
  }: {
    publishId: string;
    account: SocialAccount;
  }) {
    let status = "PROCESSING";
    let statusResponse;
    let attempts = 0;
    const delay = 5000; // 5 seconds
    const maxAttempts = 48; // 48 attempts = 240 seconds = 4 minutes

    while (
      this.#processingStatuses.includes(status) &&
      attempts < maxAttempts
    ) {
      this.#requests.push({
        statusRequest: {
          url: "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
          params: {
            publish_id: publishId,
          },
        },
      });
      statusResponse = await axios.post(
        "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
        {
          publish_id: publishId,
        },
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );

      this.#responses.push({ statusResponse: statusResponse.data });

      status = statusResponse.data.data.status;
      attempts++;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (
      !this.#processedStatuses.includes(status) &&
      !this.#processingStatuses.includes(status)
    ) {
      throw new Error(`Upload failed with status: ${status}.`);
    }

    return status;
  }

  async #getPublishId({
    postUrl,
    payload,
    account,
  }: {
    postUrl: string;
    payload: any;
    account: SocialAccount;
  }) {
    this.#requests.push({
      publishIdRequest: {
        postUrl: postUrl,
        payload: payload,
      },
    });

    const initResponse = await axios.post(postUrl, payload, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    });

    this.#responses.push({
      publishIdResponse: initResponse.data,
    });

    const { publish_id } = initResponse.data.data;

    return publish_id;
  }

  async #processVideo({
    medium,
    caption,
    coverTimestamp,
    account,
    platformData,
  }: {
    medium: PostMedia;
    caption: string;
    platformData: TiktokConfiguration;
    coverTimestamp: number | undefined;
    account: SocialAccount;
  }) {
    // Get the signed URL for the file
    const signedUrl = await this.getSignedUrlForFile(medium);

    if (platformData?.is_draft) {
      return await this.#getPublishId({
        postUrl:
          "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        payload: {
          post_info: {
            title: caption,
            video_cover_timestamp_ms: coverTimestamp
              ? coverTimestamp
              : undefined,
            is_aigc:
              platformData?.is_ai_generated === undefined
                ? false
                : platformData.is_ai_generated,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: signedUrl,
          },
        },
        account,
      });
    }

    return await this.#getPublishId({
      postUrl: "https://open.tiktokapis.com/v2/post/publish/video/init/",
      payload: {
        post_info: {
          title: caption,
          privacy_level:
            platformData.privacy_status == "private"
              ? "SELF_ONLY"
              : "PUBLIC_TO_EVERYONE",
          disable_duet:
            platformData.allow_duet === undefined
              ? false
              : !platformData.allow_duet,
          disable_comment:
            platformData.allow_comment === undefined
              ? false
              : !platformData.allow_comment,
          disable_stitch:
            platformData.allow_stitch === undefined
              ? false
              : !platformData.allow_stitch,
          video_cover_timestamp_ms: coverTimestamp ? coverTimestamp : undefined,
          brand_content_toggle:
            platformData.disclose_branded_content === undefined
              ? false
              : platformData.disclose_branded_content,
          brand_organic_toggle:
            platformData.disclose_your_brand === undefined
              ? false
              : platformData.disclose_your_brand,
          is_aigc:
            platformData.is_ai_generated === undefined
              ? false
              : platformData.is_ai_generated,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: signedUrl,
        },
      },
      account,
    });
  }

  async #processImages({
    media,
    caption,
    title,
    account,
    platformData,
  }: {
    media: PostMedia[];
    caption: string;
    title: string | undefined;
    account: SocialAccount;
    platformData: TiktokConfiguration;
  }) {
    const allowedMedia = media.slice(0, this.#maxItems);

    // Get signed URLs for all images
    const photoUrls = [];
    for (const medium of allowedMedia) {
      if (medium.type === "video") continue;

      const signedUrl = await this.#transformImage(medium);
      photoUrls.push(signedUrl);
    }

    return await this.#getPublishId({
      postUrl: "https://open.tiktokapis.com/v2/post/publish/content/init/",
      payload: {
        post_info: {
          title: (title || caption).slice(0, this.#titleLength),
          description: caption,
          privacy_level:
            platformData.privacy_status == "private"
              ? "SELF_ONLY"
              : "PUBLIC_TO_EVERYONE",
          disable_comment:
            platformData.allow_comment === undefined
              ? false
              : !platformData.allow_comment,
          auto_add_music:
            platformData.auto_add_music === undefined
              ? true
              : platformData.auto_add_music,
          brand_content_toggle:
            platformData.disclose_branded_content === undefined
              ? false
              : platformData.disclose_branded_content,
          brand_organic_toggle:
            platformData.disclose_your_brand === undefined
              ? false
              : platformData.disclose_your_brand,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_cover_index: 0,
          photo_images: photoUrls,
        },
        post_mode: platformData?.is_draft ? "MEDIA_UPLOAD" : "DIRECT_POST",
        media_type: "PHOTO",
      },
      account,
    });
  }

  async #getErrorDetails(error: any) {
    return {
      message: error.message,
      response: error.response
        ? {
            data: error.response.data,
            status: error.response.status,
            headers: error.response.headers,
          }
        : "No response data",
      request: error.request
        ? {
            method: error.request.method,
            url: error.request.path,
            headers: error.request.headers,
          }
        : "No request data",
    };
  }

  async #transformImage(medium: PostMedia): Promise<string> {
    const signedUrl = await this.getSignedUrlForFile(medium);

    const response = await axios({
      url: signedUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(response.data);

    // Step 2: Get image metadata and downscale so the short side is <= 1080
    const { width, height } = await sharp(imageBuffer).metadata();
    let safeWidth = width;
    let safeHeight = height;

    if (safeWidth && safeHeight) {
      const shortSide = Math.min(safeWidth, safeHeight);
      if (shortSide > 1080) {
        const scale = 1080 / shortSide;
        safeWidth = Math.round(safeWidth * scale);
        safeHeight = Math.round(safeHeight * scale);
      }
    }

    // Step 4: Process image with Sharp (resize & compress)
    let processedImage = await sharp(imageBuffer)
      .rotate()
      .resize({ width: safeWidth, height: safeHeight, fit: "inside" })
      .jpeg({ quality: 100 })
      .toBuffer();

    if (processedImage.length > this.#maxFileSize) {
      processedImage = await sharp(processedImage)
        .jpeg({ quality: 80 })
        .toBuffer();

      if (processedImage.length > this.#maxFileSize) {
        processedImage = await sharp(processedImage)
          .jpeg({ quality: 60 })
          .toBuffer();
      }
    }

    const key =
      this.#getFileKeyFromPublicUrl(signedUrl, this.#bucket) || "fileupload";
    const processedKey = `${key.split(".")[0]}_tiktok`;

    const { error: processedImageUploadError } =
      await this.#localSupabaseClient.storage
        .from(this.#bucket)
        .upload(processedKey, processedImage, {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
          upsert: true,
        });

    if (processedImageUploadError) {
      console.error("Error Processing Image", processedImageUploadError);
      throw new Error(
        `Error Processing Image: ${processedImageUploadError.message}`
      );
    }

    this.#addedMedia.push({
      key: processedKey,
      bucket: this.#bucket,
    });

    const { data: processedImageUpload } =
      await this.#localSupabaseClient.storage
        .from(this.#bucket)
        .getPublicUrl(processedKey);

    return processedImageUpload!.publicUrl;
  }

  #getFileKeyFromPublicUrl(publicUrl: string, bucket: string): string | null {
    const pattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
    const match = publicUrl.match(pattern);
    return match ? match[1] : null;
  }
}
