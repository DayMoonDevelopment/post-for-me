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
  InstagramConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";

export class InstagramPostClient extends PostClient {
  #maxItems = 10;
  #maxFileSize = 8 * 1024 * 1024;
  #minAspectRatio = 4 / 5;
  #maxAspectRatio = 1.91;
  #localSupabaseClient;
  #addedMedia: any[] = [];
  #requests: any[] = [];
  #responses: any[] = [];
  #bucket: string = "post-media";
  #appCredentials: PlatformAppCredentials;

  getApiBaseUrl(account: SocialAccount) {
    // Use graph.instagram.com for direct IG tokens, graph.facebook.com otherwise
    if (
      account.social_provider_metadata.connection_type === "instagram" ||
      (account.access_token && account.access_token.startsWith("IG"))
    ) {
      return "https://graph.instagram.com/v23.0";
    }
    return "https://graph.facebook.com/v23.0";
  }

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials
  ) {
    super(supabaseClient, appCredentials);

    this.#localSupabaseClient = supabaseClient;
    this.#appCredentials = appCredentials;
  }

  async refreshAccessToken(
    account: SocialAccount
  ): Promise<RefreshTokenResult> {
    try {
      if (account.social_provider_metadata.connection_type == "instagram") {
        console.log(
          `Refreshing direct Instagram token (via connection_type) for account: ${account.id}`
        );
        this.#requests.push({
          refreshRequest: "https://graph.instagram.com/refresh_access_token",
          params: {
            grant_type: "ig_refresh_token",
            access_token: account.access_token,
          },
        });
        const response = await axios.get(
          `https://graph.instagram.com/refresh_access_token`,
          {
            params: {
              grant_type: "ig_refresh_token",
              access_token: account.access_token,
            },
          }
        );

        this.#responses.push({ refreshResponse: response.data });

        if (response.data && response.data.access_token) {
          const newAccessToken = response.data.access_token;
          const expiresIn = response.data.expires_in; // Should be around 5184000 (60 days)

          return {
            access_token: newAccessToken,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          };
        } else {
          console.error(
            "Invalid response from direct Instagram token refresh:",
            response.data
          );
          throw new Error("Failed to refresh Instagram token");
        }
      } else {
        const refreshTokenParams = {
          grant_type: "fb_exchange_token",
          client_id: this.#appCredentials.app_id,
          client_secret: this.#appCredentials.app_secret,
          set_token_expires_in_60_days: true,
          fb_exchange_token: account.access_token,
        };

        this.#requests.push({
          refreshRequest: "https://graph.facebook.com/v20.0/oauth/access_token",
          params: refreshTokenParams,
        });
        const response = await axios.get(
          `https://graph.facebook.com/v20.0/oauth/access_token`,
          {
            params: refreshTokenParams,
          }
        );

        this.#responses.push({ refreshResponse: response.data });

        if (response.data && response.data.access_token) {
          const newAccessToken = response.data.access_token;
          const expiresIn = response.data.expires_in || 5184000; // Default to 60 days if not provided

          return {
            access_token: newAccessToken,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          };
        } else {
          console.error(
            "Invalid response from Instagram token refresh:",
            response.data
          );
          throw new Error("Failed to refresh Instagram token");
        }
      }
    } catch (error) {
      console.error(
        "Error refreshing Instagram token:",
        error.response?.data || error.message
      );
      if (error.response && error.response.status === 400) {
        console.error(
          "Token refresh failed. User needs to reconnect their account."
        );
      }
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
    platformConfig: InstagramConfiguration;
  }): Promise<PostResult> {
    try {
      const sanitizedCaption = this.#sanitizeCaption(caption);

      const collaborators = platformConfig?.collaborators?.slice(0, 3);

      let containerId = null;
      if (media.length == 1) {
        containerId = await this.#processMedia({
          account,
          media,
          caption: sanitizedCaption,
          placement: platformConfig?.placement,
          collaborators,
        });
      } else {
        containerId = await this.#processCarousel({
          account,
          media,
          caption: sanitizedCaption,
          collaborators,
        });
      }

      if (!containerId) {
        return {
          post_id: postId,
          provider_connection_id: account.id,
          success: false,
          error_message: "No media files found",
        };
      }

      let platformId: string | null = null;
      const maxPublishAttempts = 3;
      let publishAttempts = 0;
      while (!platformId && publishAttempts < maxPublishAttempts) {
        try {
          console.log(`Publish attempt #${publishAttempts + 1}`);
          this.#requests.push({
            publishRequest: {
              creation_id: containerId,
              access_token: account.access_token,
            },
          });
          const publishResponse = await axios.post(
            `${this.getApiBaseUrl(account)}/${account.social_provider_user_id}/media_publish`,
            {
              creation_id: containerId,
              access_token: account.access_token,
            }
          );
          if (publishResponse.data.error) {
            throw new Error(
              `Failed to publish: ${publishResponse.data.error.message}`
            );
          }

          this.#responses.push({ publishResponse: publishResponse.data });

          platformId = publishResponse.data.id;
        } catch (error) {
          if (error.response?.status === 400) {
            console.log(
              `Bad Request With Error: ${error.response?.data?.error?.message}`
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
          "Unknown Error: Unable to publish media, please try again."
        );
      }

      const platformUrl = await this.#getPostUrl({
        account,
        postId: platformId,
      });

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_url: platformUrl,
        provider_post_id: platformId,
        details: {
          warning:
            media.length > this.#maxItems
              ? `Only first ${this.#maxItems} items were posted`
              : null,
          addedMedia: this.#addedMedia,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error) {
      console.error("Error posting to Instagram:", error);

      if (error.response?.status === 401) {
        return {
          success: false,
          post_id: postId,
          provider_connection_id: account.id,
          error_message:
            "Account needs to be reconnected, Access token has expired",
          details: {
            error,
            requests: this.#requests,
            responses: this.#responses,
          },
        };
      }

      return {
        success: false,
        error_message: `Failed to post to Instagram : ${
          error.response?.data?.error?.message || error.message
        }`,
        post_id: postId,
        provider_connection_id: account.id,
        details: {
          error,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    }
  }

  async #processMedia({
    account,
    media,
    caption,
    placement,
    collaborators,
  }: {
    account: SocialAccount;
    media: PostMedia[];
    caption: string;
    placement: string | undefined;
    collaborators: string[] | undefined;
  }): Promise<string> {
    const medium = media[0];

    const isVideo = medium.type === "video";
    let signedUrl = "";
    let thumbnailUrl: string | undefined = "";
    if (!isVideo) {
      const transformedImage = await this.#transformImage({ medium });
      signedUrl = transformedImage.signedUrl!;
    } else {
      signedUrl = await this.getSignedUrlForFile(medium);
      if (medium.thumbnail_url) {
        const transformedThumbnail = await this.#transformImage({
          medium: { url: medium.thumbnail_url, type: "image" },
        });
        thumbnailUrl = transformedThumbnail.signedUrl;
      }
    }

    const createMediaParams: {
      media_type?: string;
      caption: string;
      access_token: string;
      thumb_offset?: number;
      video_url?: string;
      image_url?: string;
      cover_url?: string;
      collaborators?: string[];
    } = {
      [isVideo ? "video_url" : "image_url"]: signedUrl,
      caption: caption,
      access_token: account.access_token,
    };

    switch (placement) {
      case "stories":
        createMediaParams.media_type = "STORIES";
        break;
      default:
        createMediaParams.media_type = isVideo ? "REELS" : "IMAGE";

        if (thumbnailUrl) {
          createMediaParams.cover_url = thumbnailUrl;
        } else if (medium.thumbnail_timestamp_ms) {
          createMediaParams.thumb_offset = medium.thumbnail_timestamp_ms;
        }

        if (collaborators && collaborators.length > 0) {
          createMediaParams.collaborators = collaborators;
        }

        break;
    }

    this.#requests.push({ createMediaRequest: createMediaParams });
    const createMediaResponse = await axios.post(
      `${this.getApiBaseUrl(account)}/${account.social_provider_user_id}/media`,
      createMediaParams
    );

    this.#responses.push({ createMediaResponse: createMediaResponse.data });
    if (createMediaResponse.data.error) {
      throw new Error(
        `Failed to create media container: ${createMediaResponse.data.error.message}`
      );
    }

    const containerId = createMediaResponse.data.id;

    if (isVideo) {
      let statusData;
      const maxAttempts = 30;
      const initialDelay = 5000; // 5 seconds
      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt++;
        console.log(`Checking media status, attempt ${attempt}/${maxAttempts}`);

        this.#requests.push({
          statusRequest: {
            url: `${this.getApiBaseUrl(account)}/${containerId}`,
          },
        });
        const statusResponse = await axios.get(
          `${this.getApiBaseUrl(account)}/${containerId}`,
          {
            params: {
              fields: "status_code",
              access_token: account.access_token,
            },
          }
        );

        this.#responses.push({ statusResponse: statusResponse.data });

        statusData = statusResponse.data;
        console.log("Media status:", statusData);

        if (statusData.status_code === "FINISHED") {
          break;
        } else if (statusData.status_code === "ERROR") {
          throw new Error(`Upload failed: ${JSON.stringify(statusData)}`);
        } else {
          const delay = initialDelay * Math.pow(1.5, attempt - 1); // Exponential backoff
          console.log(
            `Media not ready. Waiting for ${
              delay / 1000
            } seconds before retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (statusData.status_code !== "FINISHED") {
        throw new Error("Max attempts reached. Failed to process media.");
      }
    }

    return containerId;
  }

  async #processCarousel({
    account,
    media,
    caption,
    collaborators,
  }: {
    account: SocialAccount;
    media: PostMedia[];
    caption: string;
    collaborators: string[] | undefined;
  }): Promise<string> {
    const containerIds = [];
    const allowedMedia = media.slice(0, this.#maxItems);

    let firstImageWidth = null;
    let firstImageHeight = null;
    let index = 0;
    for (const medium of allowedMedia) {
      const isVideo = medium.type === "video";
      let signedUrl: string = "";
      if (!isVideo) {
        const transformedImage = await this.#transformImage({
          medium,
          options: {
            firstImage: { width: firstImageWidth, height: firstImageHeight },
          },
        });

        signedUrl = transformedImage.signedUrl!;

        if (index === 0) {
          firstImageWidth = transformedImage.width;
          firstImageHeight = transformedImage.height;
        }
      } else {
        signedUrl = await this.getSignedUrlForFile(medium);
      }

      this.#requests.push({
        createCarouselItemRequest: {
          media_type: isVideo ? "VIDEO" : "IMAGE",
          [isVideo ? "video_url" : "image_url"]: signedUrl,
          is_carousel_item: true,
          access_token: account.access_token,
        },
      });
      const itemResponse = await axios.post(
        `${this.getApiBaseUrl(account)}/${account.social_provider_user_id}/media`,
        {
          media_type: isVideo ? "VIDEO" : "IMAGE",
          [isVideo ? "video_url" : "image_url"]: signedUrl,
          is_carousel_item: true,
          access_token: account.access_token,
        }
      );

      this.#responses.push({ createCarouselItemResponse: itemResponse.data });

      if (itemResponse.data.error) {
        throw new Error(
          `Failed to create item container: ${itemResponse.data.error.message}`
        );
      }

      const containerId = itemResponse.data.id;
      containerIds.push(containerId);
      index++;
      // Wait for item processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const carouselPayload: {
      media_type: string;
      children: string[];
      caption: string;
      access_token: string;
      collaborators?: string[];
    } = {
      media_type: "CAROUSEL",
      children: containerIds,
      caption: caption,
      access_token: account.access_token,
    };

    if (collaborators && collaborators.length > 0) {
      carouselPayload.collaborators = collaborators;
    }

    this.#requests.push({
      createCarouselRequest: carouselPayload,
    });
    const carouselResponse = await axios.post(
      `${this.getApiBaseUrl(account)}/${account.social_provider_user_id}/media`,
      carouselPayload
    );

    this.#responses.push({ createCarouselResponse: carouselResponse.data });

    if (carouselResponse.data.error) {
      throw new Error(
        `Failed to create carousel container: ${carouselResponse.data.error.message}`
      );
    }

    const carouselContainerId = carouselResponse.data.id;

    return carouselContainerId;
  }

  async #getPostUrl({
    account,
    postId,
  }: {
    account: SocialAccount;
    postId: string;
  }): Promise<string> {
    this.#requests.push({
      getPostUrlRequest: {
        url: `${this.getApiBaseUrl(account)}/${postId}`,
      },
    });
    // Fetch the media object to get the permalink
    const mediaResponse = await axios.get(
      `${this.getApiBaseUrl(account)}/${postId}`,
      {
        params: {
          fields: "permalink,media_type",
          access_token: account.access_token,
        },
      }
    );

    this.#responses.push({ getPostUrlResponse: mediaResponse.data });

    if (mediaResponse.data.error) {
      throw new Error(
        `Failed to fetch media details: ${mediaResponse.data.error.message}`
      );
    }

    const permalink = mediaResponse.data.permalink;
    const actualMediaType = mediaResponse.data.media_type;

    let postUrl;
    if (actualMediaType === "VIDEO" || actualMediaType === "REELS") {
      // Extract the shortcode from the permalink
      const shortcode = permalink.split("/").slice(-2)[0];
      postUrl = `https://www.instagram.com/reel/${shortcode}/`;
    } else {
      postUrl = permalink;
    }

    return postUrl;
  }

  async #transformImage({
    medium,
    options,
  }: {
    medium: PostMedia;
    options?: {
      firstImage?: {
        width: number | null | undefined;
        height: number | null | undefined;
      };
    };
  }): Promise<{
    signedUrl: string | undefined;
    width: number | undefined;
    height: number | undefined;
  }> {
    const signedUrl = await this.getSignedUrlForFile(medium);

    const response = await axios({
      url: signedUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(response.data);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const aspectRatio = width / height;
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;
    if (options?.firstImage?.width && options?.firstImage?.height) {
      const firstImageRatio =
        options?.firstImage?.width / options?.firstImage?.height;

      if (firstImageRatio !== aspectRatio) {
        targetWidth = options?.firstImage?.width;
        targetHeight = options?.firstImage?.height;
      }
    } else {
      if (aspectRatio > this.#maxAspectRatio) {
        // Too wide → crop width to fit 1.91:1
        targetWidth = Math.round(height * this.#maxAspectRatio);
      } else if (aspectRatio < this.#minAspectRatio) {
        // Too tall → crop height to fit 4:5
        targetHeight = Math.round(width / this.#minAspectRatio);
      }
    }

    // Process image with Sharp (resize & compress)
    let processedImage = await sharp(imageBuffer)
      .rotate()
      .resize({ width: targetWidth, height: targetHeight })
      .jpeg({ quality: 100 })
      .toBuffer();

    // Ensure size is within Instagram limits
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
    const processedKey = `${key.split(".")[0]}_instagram`;

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

    return {
      signedUrl: processedImageUpload?.publicUrl,
      width: targetWidth,
      height: targetHeight,
    };
  }

  #sanitizeCaption(caption: string) {
    // Instagram limits: 2,200 characters, 30 hashtags, 20 @ tags
    const maxLength = 2200;
    const maxHashtags = 30;
    const maxMentions = 20;

    let cleanedCaption = caption;

    // First normalize whitespace
    cleanedCaption = cleanedCaption
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();

    // Extract hashtags and mentions with their positions
    const hashtagMatches = [
      ...cleanedCaption.matchAll(/#[\w\u00C0-\u017F-]+/g),
    ];
    const mentionMatches = [
      ...cleanedCaption.matchAll(/@[\w\u00C0-\u017F.-]+/g),
    ];

    // Remove duplicates and limit hashtags
    if (hashtagMatches.length > 0) {
      console.log(`Found ${hashtagMatches.length} hashtags`);

      // Create a map to track unique hashtags (case-insensitive)
      const uniqueHashtags = new Map();
      const hashtagsToRemove = [];

      // Process hashtags from end to beginning to maintain order
      for (let i = hashtagMatches.length - 1; i >= 0; i--) {
        const match = hashtagMatches[i];
        const hashtag = match[0];
        const lowerHashtag = hashtag.toLowerCase();

        // If we've seen this hashtag before (duplicate) or we're over the limit, mark for removal
        if (
          uniqueHashtags.has(lowerHashtag) ||
          uniqueHashtags.size >= maxHashtags
        ) {
          hashtagsToRemove.push({
            text: hashtag,
            index: match.index,
            length: hashtag.length,
          });
        } else {
          uniqueHashtags.set(lowerHashtag, hashtag);
        }
      }

      // Remove excess/duplicate hashtags (from end to beginning to preserve indices)
      if (hashtagsToRemove.length > 0) {
        console.log(
          `Removing ${hashtagsToRemove.length} excess/duplicate hashtags`
        );

        // Sort by index descending to remove from end first
        hashtagsToRemove.sort((a, b) => b.index - a.index);

        for (const toRemove of hashtagsToRemove) {
          // Remove the hashtag and any trailing spaces
          const beforeHashtag = cleanedCaption.substring(0, toRemove.index);
          const afterHashtag = cleanedCaption.substring(
            toRemove.index + toRemove.length
          );

          // Also remove trailing space if it exists
          const trimmedAfter = afterHashtag.replace(/^[ \t]+/, "");
          cleanedCaption = beforeHashtag + trimmedAfter;
        }
      }
    }

    // Handle mentions similarly
    if (mentionMatches.length > maxMentions) {
      console.log(
        `Too many mentions (${mentionMatches.length}), limiting to ${maxMentions}`
      );

      // Remove excess mentions from the end
      const mentionsToRemove = mentionMatches.slice(maxMentions);

      // Sort by index descending to remove from end first
      mentionsToRemove.sort((a, b) => b.index - a.index);

      for (const match of mentionsToRemove) {
        const beforeMention = cleanedCaption.substring(0, match.index);
        const afterMention = cleanedCaption.substring(
          match.index + match[0].length
        );
        const trimmedAfter = afterMention.replace(/^[ \t]+/, "");
        cleanedCaption = beforeMention + trimmedAfter;
      }
    }

    // Clean up any excessive whitespace that might have been created
    cleanedCaption = cleanedCaption
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Trim if over character limit
    if (cleanedCaption.length > maxLength) {
      console.log(
        `Caption too long: ${cleanedCaption.length} chars, trimming to ${maxLength}`
      );

      let trimmedCaption = cleanedCaption.substring(0, maxLength);
      const lastSpaceIndex = trimmedCaption.lastIndexOf(" ");

      if (lastSpaceIndex > maxLength * 0.95) {
        trimmedCaption = trimmedCaption.substring(0, lastSpaceIndex);
      }

      cleanedCaption = trimmedCaption.trim();
    }

    return cleanedCaption;
  }

  #getFileKeyFromPublicUrl(publicUrl: string, bucket: string): string | null {
    const pattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
    const match = publicUrl.match(pattern);
    return match ? match[1] : null;
  }
}
