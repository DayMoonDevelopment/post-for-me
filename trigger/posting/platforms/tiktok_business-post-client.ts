import { SupabaseClient } from "@supabase/supabase-js";
import { wait } from "@trigger.dev/sdk";
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

export class TikTokBusinessPostClient extends PostClient {
  #tokenUrl =
    "https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/";
  #processingStatuses = [
    "PROCESSING",
    "PROCESSING_DOWNLOAD",
    "PROCESSING_UPLOAD",
  ];
  #processedStatuses = [
    "PUBLISH_COMPLETE",
    "PUBLISH_SUCCESS",
    "SEND_TO_USER_INBOX",
  ];
  #maxItems = 32;
  #titleLength = 85;
  #clientKey: string;
  #clientSecret: string;
  #localSupabaseClient;
  #maxFileSize = 20 * 1024 * 1024;
  #allowedAspectRatios = [
    { ratio: 9 / 16, width: 1080, height: 1920 },
    { ratio: 3 / 4, width: 1080, height: 1440 },
    { ratio: 1, width: 1080, height: 1080 },
    { ratio: 16 / 9, width: 1920, height: 1080 },
  ];
  #addedMedia: any[] = [];
  #requests: any[] = [];
  #responses: any[] = [];
  #bucket: string = "post-media";

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials,
  ) {
    super(supabaseClient, appCredentials);

    this.#clientKey = appCredentials.app_id;
    this.#clientSecret = appCredentials.app_secret;

    this.#localSupabaseClient = supabaseClient;
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    const refreshRequestBody = {
      client_id: this.#clientKey,
      client_secret: this.#clientSecret,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    };

    this.#requests.push({ refreshRequest: { url: this.#tokenUrl } });
    const refreshResponse = await axios.post(
      this.#tokenUrl,
      refreshRequestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const refreshData = refreshResponse.data;

    this.#responses.push({ refreshResponse: refreshData });

    if (refreshData.code !== 0) {
      throw new Error(`TikTok API error: ${refreshData.message}`);
    }

    const { access_token, refresh_token, expires_in } = refreshData.data;

    const newExpirationDate = new Date(Date.now() + expires_in * 1000);

    // Set expiration so it refreshes two days early.
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
        const { status } = await this.#getPublishStatus({ publishId, account });

        return {
          success: true,
          post_id: postId,
          provider_connection_id: account.id,
          error_message: this.#processingStatuses.includes(status)
            ? "TikTok is still processing this draft, post will appear in your inbox once finished processing."
            : undefined,
          details: {
            status: "Saved as draft",
            message:
              "Content saved as draft in TikTok. Check your TikTok inbox notifications to continue editing and publish.",
            addedMedia: this.#addedMedia,
            requests: this.#requests,
            responses: this.#responses,
            username: creatorInfoResponse.data.data.username,
            publish_id: publishId,
          },
          provider_post_url: `https://www.tiktok.com/@${creatorInfoResponse.data.data.username}`,
          provider_post_id: publishId,
        };
      }

      const { status, publicPostId } = await this.#getPublishStatus({
        publishId,
        account,
        waitForPublicPostId: true,
      });

      if (this.#processingStatuses.includes(status)) {
        return {
          success: false,
          post_id: postId,
          provider_connection_id: account.id,
          details: {
            status: "Processing",
            message: "Still Proccessing, check TikTok account to confirm status",
            addedMedia: this.#addedMedia,
            requests: this.#requests,
            responses: this.#responses,
            username: creatorInfoResponse.data.data.username,
            publish_id: publishId,
          },
          provider_post_url: `https://www.tiktok.com/@${creatorInfoResponse.data.data.username}`,
          provider_post_id: publicPostId ?? publishId,
        };
      }

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: publicPostId ?? publishId,
        details: {
          status: "Published successfully",
          addedMedia: this.#addedMedia,
          requests: this.#requests,
          responses: this.#responses,
          username: creatorInfoResponse.data.data.username,
          publish_id: publishId,
        },
        provider_post_url: `https://www.tiktok.com/@${creatorInfoResponse.data.data.username}`,
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
    const creatorInfoUrl =
      "https://business-api.tiktok.com/open_api/v1.3/business/get/";

    this.#requests.push({
      creatorRequest: creatorInfoUrl,
    });

    const response = await axios.get(
      `${creatorInfoUrl}?business_id=${account.social_provider_user_id}&fields=["username"]`,
      {
        headers: {
          "Access-Token": `${account.access_token}`,
        },
      },
    );

    this.#responses.push({ creatorResponse: response.data });

    return response;
  }

  async #getPublishStatus({
    publishId,
    account,
    waitForPublicPostId = false,
  }: {
    publishId: string;
    account: SocialAccount;
    waitForPublicPostId?: boolean;
  }) {
    let status = "PROCESSING";
    let failReason;
    let publicPostId: string | undefined;
    let attempts = 0;
    let publicPostIdAttempts = 0;
    const initialDelayMs = 5000;
    const maxAttempts = 15;
    const maxPublicPostIdAttempts = 3;

    const statusUrl =
      "https://business-api.tiktok.com/open_api/v1.3/business/publish/status/";
    while (
      (this.#processingStatuses.includes(status) ||
        (waitForPublicPostId &&
          this.#processedStatuses.includes(status) &&
          !publicPostId &&
          publicPostIdAttempts < maxPublicPostIdAttempts)) &&
      attempts < maxAttempts
    ) {
      this.#requests.push({
        statusRequest: {
          url: statusUrl,
          params: {
            publish_id: publishId,
          },
        },
      });
      const statusResponse = await axios.get<string>(
        `${statusUrl}?business_id=${account.social_provider_user_id}&publish_id=${publishId}`,
        {
          headers: {
            "Access-Token": `${account.access_token}`,
          },
          transformResponse: [(data) => data],
        },
      );

      const parsedStatusResponse = JSON.parse(statusResponse.data);

      this.#responses.push({ statusResponse: parsedStatusResponse });

      status = parsedStatusResponse.data.status;
      failReason = parsedStatusResponse.data.reason;
      publicPostId = parsedStatusResponse.data.post_ids?.[0] || publicPostId;
      attempts++;

      const waitingForPublicPostId =
        waitForPublicPostId &&
        this.#processedStatuses.includes(status) &&
        !publicPostId;

      if (waitingForPublicPostId) {
        publicPostIdAttempts++;
      }

      if (
        (this.#processingStatuses.includes(status) ||
          (waitingForPublicPostId &&
            publicPostIdAttempts < maxPublicPostIdAttempts)) &&
        attempts < maxAttempts
      ) {
        const delay = waitingForPublicPostId
          ? initialDelayMs
          : initialDelayMs * Math.pow(1.5, attempts - 1);
        await wait.for({ seconds: delay / 1000 });
      }
    }

    if (
      !this.#processedStatuses.includes(status) &&
      !this.#processingStatuses.includes(status)
    ) {
      if (failReason) {
        console.error("TikTok Business upload failed", {
          status,
          fail_reason: failReason,
        });
      }

      throw new Error(
        `Upload failed with status: ${status}.${
          failReason ? ` Fail reason: ${failReason}` : ""
        }`,
      );
    }

    return { status, failReason, publicPostId };
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
        "Access-Token": `${account.access_token}`,
        "Content-Type": "application/json",
      },
    });

    this.#responses.push({
      publishIdResponse: initResponse.data,
    });

    if (initResponse.data.code !== 0) {
      throw new Error(`Failed to publish media: ${initResponse.data.message}`);
    }

    const { share_id } = initResponse.data.data;

    return share_id;
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

    return await this.#getPublishId({
      postUrl:
        "https://business-api.tiktok.com/open_api/v1.3/business/video/publish/",
      payload: {
        business_id: account.social_provider_user_id,
        video_url: signedUrl,
        custom_thumbnail_url: medium.thumbnail_url,
        post_info: {
          caption,
          upload_to_draft: platformData?.is_draft ? true : undefined,
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
          thumbnail_offset: coverTimestamp ? coverTimestamp : undefined,
          is_branded_content:
            platformData.disclose_branded_content === undefined
              ? false
              : platformData.disclose_branded_content,
          is_brand_organic:
            platformData.disclose_your_brand === undefined
              ? false
              : platformData.disclose_your_brand,
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
      postUrl:
        "https://business-api.tiktok.com/open_api/v1.3/business/photo/publish/",
      payload: {
        business_id: account.social_provider_user_id,
        photo_images: photoUrls,
        photo_cover_index: 0,
        post_info: {
          title: (title ?? "").slice(0, this.#titleLength),
          caption,
          is_draft: platformData?.is_draft ? true : undefined,
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
          is_branded_content:
            platformData.disclose_branded_content === undefined
              ? false
              : platformData.disclose_branded_content,
          is_brand_organic:
            platformData.disclose_your_brand === undefined
              ? false
              : platformData.disclose_your_brand,
        },
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

    // Get image metadata and choose nearest TikTok-allowed ratio.
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) {
      throw new Error("Unable to read image dimensions for TikTok upload");
    }

    const orientation = metadata.orientation || 1;
    const isExifRotated = [5, 6, 7, 8].includes(orientation);
    const displayedWidth = isExifRotated ? height : width;
    const displayedHeight = isExifRotated ? width : height;

    const aspectRatio = displayedWidth / displayedHeight;
    const targetRatio = this.#allowedAspectRatios.reduce((closest, current) =>
      Math.abs(current.ratio - aspectRatio) <
      Math.abs(closest.ratio - aspectRatio)
        ? current
        : closest,
    );

    // Process image with Sharp (normalize orientation, crop, resize and compress).
    let processedImage = await sharp(imageBuffer)
      .rotate()
      .resize({
        width: targetRatio.width,
        height: targetRatio.height,
        fit: "cover",
        position: "center",
      })
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
        `Error Processing Image: ${processedImageUploadError.message}`,
      );
    }

    this.#addedMedia.push({
      key: processedKey,
      bucket: this.#bucket,
    });

    const { data: processedImageUpload } = this.#localSupabaseClient.storage
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
