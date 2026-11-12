import { PostClient } from "../post-client";
import {
  SendTweetV2Params,
  TwitterApi,
  TwitterApiTokens,
} from "twitter-api-v2";
import { tasks, wait } from "@trigger.dev/sdk";
import type { uploadTwitterMedia } from "../../upload-twitter-media";
import * as twitterText from "twitter-text";
import type { ParseTweetOptions } from "twitter-text";
import {
  PlatformAppCredentials,
  PostMedia,
  RefreshTokenResult,
  SocialAccount,
  TwitterConfiguration,
} from "../post.types";

const { parseTweet } = twitterText;

// `configs` isn't part of twitter-text's typed public API
// (@types/twitter-text doesn't declare it), but the package does export it
// at runtime alongside `parseTweet`. Sourcing the v3 weighting config
// directly from the installed package - instead of hand-copying its ranges -
// keeps our weighting in sync with whatever version of twitter-text we ship.
const TWITTER_TEXT_V3_CONFIG = (
  twitterText as unknown as {
    configs: { version3: ParseTweetOptions };
  }
).configs.version3;

export function getAllowedCaption(
  caption: string,
  characterLimit: number,
): { allowedCaption: string; trimmed: boolean } {
  if (!caption) return { allowedCaption: caption, trimmed: false };

  const parseOptions = {
    ...TWITTER_TEXT_V3_CONFIG,
    maxWeightedTweetLength: characterLimit,
  };

  const parsed = parseTweet(caption, parseOptions);

  if (parsed.weightedLength <= characterLimit) {
    return { allowedCaption: caption, trimmed: false };
  }

  // Binary search for the longest prefix (by Unicode code point, so we
  // never split a surrogate pair) whose weighted length fits the limit.
  // We can't use `validRangeEnd` here: twitter-text freezes it at the first
  // character it considers "invalid" (e.g. a stray BOM) and never advances
  // it again even as weightedLength keeps growing past the limit, which
  // can collapse a caption down to just a few characters.
  const codePoints = Array.from(caption);
  let low = 0;
  let high = codePoints.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = codePoints.slice(0, mid).join("");

    if (parseTweet(candidate, parseOptions).weightedLength <= characterLimit) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return {
    allowedCaption: codePoints.slice(0, low).join(""),
    trimmed: true,
  };
}

export class TwitterPostClient extends PostClient {
  #IMAGE_LIMIT = 4;
  #PREMIUM_CHARACTER_LIMIT = 2200;
  #CHARACTER_LIMIT = 280;
  #appKey;
  #appSecret;

  constructor(appCredentials: PlatformAppCredentials) {
    super(appCredentials);

    this.#appKey = appCredentials.app_id;
    this.#appSecret = appCredentials.app_secret;
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    if (account.social_provider_metadata?.connection_type !== "oauth2") {
      // No need to refresh OAuth 1.0a tokens for Twitter, they don't expire.
      const SIX_MONTHS_IN_MS = 180 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + SIX_MONTHS_IN_MS).toISOString();

      return {
        access_token: account.access_token,
        expires_at: expiresAt,
        refresh_token: account.refresh_token,
      };
    }

    const client = new TwitterApi({
      clientId: this.#appKey,
      clientSecret: this.#appSecret,
    });

    const { accessToken, refreshToken, expiresIn } =
      await client.refreshOAuth2Token(account.refresh_token || "");

    return {
      access_token: accessToken,
      // X rotates OAuth2 refresh tokens on every use; fall back to the
      // existing one only if a new one wasn't returned.
      refresh_token: refreshToken || account.refresh_token,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
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
      const isOAuth2 =
        account.social_provider_metadata?.connection_type === "oauth2";

      const twitterClient = isOAuth2
        ? new TwitterApi(account.access_token)
        : (new TwitterApi({
            appKey: this.#appKey,
            appSecret: this.#appSecret,
            accessToken: account.access_token,
            accessSecret: account.refresh_token,
          } as TwitterApiTokens));

      const mediaIds = await this.#processMedia({
        twitterClient,
        media,
        isOAuth2,
        account,
      });

      const characterLimit = account.social_provider_metadata?.has_platform_premium
        ? this.#PREMIUM_CHARACTER_LIMIT
        : this.#CHARACTER_LIMIT;

      const { allowedCaption, trimmed } = getAllowedCaption(
        caption,
        characterLimit,
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

      if (platformConfig?.reply_to_tweet_id) {
        postPayload.reply = {
          in_reply_to_tweet_id: platformConfig.reply_to_tweet_id,
        };
      }

      this.requests.push({
        postRequest: postPayload,
      });

      const tweet = await twitterClient.v2.tweet(postPayload);

      this.responses.push({
        postResponse: tweet,
      });

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: tweet.data.id,
        provider_post_url: `https://twitter.com/user/status/${tweet.data.id}`,
        details: {
          trimmed,
          requests: this.requests,
          responses: this.responses,
        },
      };
    } catch (error) {
      console.error(
        `Error posting to Twitter for account ${account.id} :`,
        error,
      );
      if (error.data && error.data.errors) {
        console.error(
          "Twitter API errors:",
          JSON.stringify(error.data.errors, null, 2),
        );
      }
      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: `Failed to post to Twitter: ${error.message}`,
        details: {
          error,
          requests: this.requests,
          responses: this.responses,
        },
      };
    }
  }

  async #processMedia({
    twitterClient,
    media,
    isOAuth2,
    account,
  }: {
    twitterClient: TwitterApi;
    media: PostMedia[];
    isOAuth2: boolean;
    account: SocialAccount;
  }): Promise<string[]> {
    const mediaIds: string[] = [];
    if (media.length == 1) {
      const medium = media[0];
      this.requests.push({ uploadRequest: { file: medium } });
      const mediaId = await this.#uploadMedium(medium, account, isOAuth2);

      this.responses.push({ uploadResponse: { mediaId } });
      mediaIds.push(mediaId);

      if (medium.alt_text) {
        await twitterClient.v1.createMediaMetadata(mediaId, {
          alt_text: { text: medium.alt_text },
        });
      }

      // Add a small delay after successful upload
      await wait.for({ seconds: 1 });
    } else {
      const allowedMedia = media.slice(0, this.#IMAGE_LIMIT);
      for (const medium of allowedMedia) {
        if (medium.type === "video") continue;
        this.requests.push({ uploadRequest: { file: medium } });
        const mediaId = await this.#uploadMedium(medium, account, isOAuth2);

        this.responses.push({ uploadResponse: { mediaId } });
        mediaIds.push(mediaId);

        if (medium.alt_text) {
          await twitterClient.v1.createMediaMetadata(mediaId, {
            alt_text: { text: medium.alt_text },
          });
        }
      }
      // Add a small delay after uploads
      await wait.for({ seconds: 1 });
    }

    return mediaIds;
  }

  async #uploadMedium(
    medium: PostMedia,
    account: SocialAccount,
    isOAuth2: boolean,
  ): Promise<string> {
    const result = await tasks.triggerAndWait<typeof uploadTwitterMedia>(
      "upload-twitter-media",
      {
        medium,
        auth: {
          appKey: this.#appKey,
          appSecret: this.#appSecret,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          isOAuth2,
        },
      },
    );
    if (!result.ok) {
      const error = result.error;
      const message = error && typeof error === "object" && "message" in error
        && typeof error.message === "string" ? error.message : undefined;
      throw new Error(message || "Failed to upload Twitter media", {
        cause: error,
      });
    }
    if (!result.output.success) {
      const { message, error } = result.output;
      throw Object.assign(new Error(message, { cause: error }), {
        data: "error" in error ? error.error : undefined,
        toJSON: () => error,
      });
    }
    return result.output.mediaId;
  }
}
