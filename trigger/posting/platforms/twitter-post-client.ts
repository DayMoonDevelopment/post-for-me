/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { PostClient } from "../post-client";
import {
  SendTweetV2Params,
  TwitterApi,
  TwitterApiTokens,
} from "twitter-api-v2";
import sharp from "sharp";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  PlatformAppCredentials,
  PostMedia,
  RefreshTokenResult,
  SocialAccount,
  TwitterConfiguration,
} from "../post.types";

export class TwitterPostClient extends PostClient {
  #IMAGE_LIMIT = 4;
  #PREMIUM_CHARACTER_LIMIT = 2200;
  #CHARACTER_LIMIT = 280;
  #appKey;
  #appSecret;
  #requests: any[] = [];
  #responses: any[] = [];
  #maxFileSize = 5 * 1024 * 1024;

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials
  ) {
    super(supabaseClient, appCredentials);

    this.#appKey = appCredentials.app_id;
    this.#appSecret = appCredentials.app_secret;
  }

  async refreshAccessToken(
    account: SocialAccount
  ): Promise<RefreshTokenResult> {
    //No Need to refresh tokens for Twitter
    return {
      access_token: account.access_token,
      expires_at: account.access_token_expires_at!.toISOString(),
      refresh_token: account.refresh_token,
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
    platformConfig: TwitterConfiguration;
  }) {
    try {
      const twitterClient = new TwitterApi({
        appKey: this.#appKey,
        appSecret: this.#appSecret,
        accessToken: account.access_token,
        accessSecret: account.refresh_token,
      } as TwitterApiTokens);

      const mediaIds = await this.#processMedia({ twitterClient, media });

      const allowedCaption = caption.slice(
        0,
        account.social_provider_metadata?.has_platform_premium
          ? this.#PREMIUM_CHARACTER_LIMIT
          : this.#CHARACTER_LIMIT
      );

      const postPayload: SendTweetV2Params = {
        text: allowedCaption || " ",
      };

      if (mediaIds?.length > 0) {
        postPayload.media = {
          media_ids: mediaIds as
            | [string]
            | [string, string]
            | [string, string, string]
            | [string, string, string, string],
        };
      }

      if (platformConfig?.poll) {
        postPayload.poll = {
          ...platformConfig.poll,
          options: platformConfig.poll.options.splice(0, 4),
        };
      }

      if (platformConfig?.reply_settings) {
        postPayload.reply_settings = platformConfig.reply_settings;
      }

      if (platformConfig?.community_id) {
        postPayload.community_id = platformConfig.community_id;
      }

      if (platformConfig?.quote_tweet_id) {
        postPayload.quote_tweet_id = platformConfig.quote_tweet_id;
      }

      this.#requests.push({
        postRequest: postPayload,
      });

      const tweet = await twitterClient.v2.tweet(postPayload);

      this.#responses.push({
        postResponse: tweet,
      });

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: tweet.data.id,
        provider_post_url: `https://twitter.com/user/status/${tweet.data.id}`,
        details: {
          trimmed: caption.length > allowedCaption.length,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error) {
      console.error(
        `Error posting to Twitter for account ${account.id} :`,
        error
      );
      if (error.data && error.data.errors) {
        console.error(
          "Twitter API errors:",
          JSON.stringify(error.data.errors, null, 2)
        );
      }
      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: `Failed to post to Twitter: ${error.message}`,
        details: {
          error,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    }
  }

  async #processMedia({
    twitterClient,
    media,
  }: {
    twitterClient: TwitterApi;
    media: PostMedia[];
  }): Promise<string[]> {
    const mediaIds: string[] = [];
    if (media.length == 1) {
      const medium = media[0];
      this.#requests.push({ uploadRequest: { file: medium } });
      const file = await this.getFile(medium);
      const buffer = Buffer.from(await file.arrayBuffer());
      const isVideo = medium.type === "video";
      const mediaId = isVideo
        ? await this.#uploadVideo({ twitterClient, file, buffer })
        : await this.#uploadImage({ twitterClient, file, buffer });

      this.#responses.push({ uploadResponse: { mediaId } });
      mediaIds.push(mediaId);
      // Add a small delay after successful upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      const allowedMedia = media.slice(0, this.#IMAGE_LIMIT);
      for (const medium of allowedMedia) {
        if (medium.type === "video") continue;
        this.#requests.push({ uploadRequest: { file: medium } });
        const file = await this.getFile(medium);
        const buffer = Buffer.from(await file.arrayBuffer());

        const mediaId = await this.#uploadImage({
          twitterClient,
          file,
          buffer,
        });

        this.#responses.push({ uploadResponse: { mediaId } });
        mediaIds.push(mediaId);
      }
      // Add a small delay after uploads
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return mediaIds;
  }

  async #uploadVideo({
    twitterClient,
    file,
    buffer,
  }: {
    twitterClient: TwitterApi;
    file: File;
    buffer: Buffer;
  }): Promise<string> {
    const mediaId = await twitterClient.v1.uploadMedia(buffer, {
      mimeType: file.type,
      longVideo: true,
    });

    // Add delay and media status check
    let mediaInfo;
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      try {
        mediaInfo = await twitterClient.v1.mediaInfo(mediaId);

        if (mediaInfo.processing_info?.state === "succeeded") {
          break;
        } else if (mediaInfo.processing_info?.state === "failed") {
          throw new Error("Media processing failed");
        }

        console.log(
          `Media processing status: ${mediaInfo.processing_info?.state}`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        attempts++;
      } catch (error) {
        console.error("Error checking media status:", error);
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error("Media processing timeout");
    }

    return mediaId;
  }

  async #uploadImage({
    twitterClient,
    file,
    buffer,
  }: {
    twitterClient: TwitterApi;
    file: File;
    buffer: Buffer;
  }): Promise<string> {
    let processedImage = buffer;
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

    return await twitterClient.v1.uploadMedia(processedImage, {
      mimeType: file.type,
    });
  }
}
