import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger, task, tags, tasks } from "@trigger.dev/sdk";
import { PostClient } from "./posting/post-client";
import { TwitterPostClient } from "./posting/platforms/twitter-post-client";
import { InstagramPostClient } from "./posting/platforms/instagram-post-client";
import { FacebookPostClient } from "./posting/platforms/facebook-post-client";
import { LinkedInPostClient } from "./posting/platforms/linkedin-post-client";
import { TikTokPostClient } from "./posting/platforms/tiktok-post-client";
import { BlueskyPostClient } from "./posting/platforms/bluesky-post-client";
import { ThreadsPostClient } from "./posting/platforms/threads-post-client";
import { PinterestPostClient } from "./posting/platforms/pinterest-post-client";
import { YouTubePostClient } from "./posting/platforms/youtube-post-client";
import {
  IndividualPostData,
  PlatformAppCredentials,
  PostResult,
  SocialAccount,
} from "./posting/post.types";
import { TikTokBusinessPostClient } from "posting/platforms/tiktok_business-post-client";
import { differenceInDays } from "date-fns";
import { Database } from "@post-for-me/db";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY!);
const STRIPE_METER_EVENT = process.env.STRIPE_METER_EVENT || "successful_post";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createPostClient = ({
  supabaseClient,
  platformName,
  appCredentials,
}: {
  supabaseClient: SupabaseClient;
  platformName: string;
  appCredentials: PlatformAppCredentials;
}): PostClient => {
  switch (platformName) {
    case "x":
      return new TwitterPostClient(supabaseClient, appCredentials);
    case "instagram":
      return new InstagramPostClient(supabaseClient, appCredentials);
    case "facebook":
      return new FacebookPostClient(supabaseClient, appCredentials);
    case "linkedin":
      return new LinkedInPostClient(supabaseClient, appCredentials);
    case "tiktok":
      return new TikTokPostClient(supabaseClient, appCredentials);
    case "bluesky":
      return new BlueskyPostClient(supabaseClient, appCredentials);
    case "threads":
      return new ThreadsPostClient(supabaseClient, appCredentials);
    case "pinterest":
      return new PinterestPostClient(supabaseClient, appCredentials);
    case "youtube":
      return new YouTubePostClient(supabaseClient, appCredentials);
    case "tiktok_business":
      return new TikTokBusinessPostClient(supabaseClient, appCredentials);
    default:
      throw Error("Invalid Platform");
  }
};

const platformsToAlwaysRefresh = ["youtube", "bluesky"];

const handleTokenRefresh = async ({
  postClient,
  account,
}: {
  postClient: PostClient;
  account: SocialAccount;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { access_token, expires_at, refresh_token } =
      await postClient.refreshAccessToken(account);

    if (!access_token) {
      console.error(
        `Failed to refresh ${account.provider} token for account ${account.id}`
      );

      return {
        success: false,
        error: `Failed to refresh ${account.provider} token for account ${account.id}`,
      };
    }

    const updateData: {
      access_token?: string;
      access_token_expires_at?: string;
      refresh_token?: string;
    } = {
      access_token,
      access_token_expires_at: expires_at,
    };

    account.access_token = access_token;
    account.access_token_expires_at = new Date(expires_at);

    if (refresh_token) {
      updateData.refresh_token = refresh_token;
      account.refresh_token = refresh_token;
    }

    const { error } = await supabaseClient
      .from("social_provider_connections")
      .update(updateData)
      .eq("id", account.id);

    if (error) {
      console.error(error);

      return {
        success: false,
        error: error.message,
      };
    }
  } catch (refreshError) {
    console.error(refreshError);
    return {
      success: false,
      error: refreshError.message,
    };
  }

  return {
    success: true,
  };
};

export const postToPlatform = task({
  id: "post-to-platform",
  maxDuration: 3600,
  retry: {
    maxAttempts: 2,
    outOfMemory: {
      machine: "large-1x",
    },
  },
  machine: "medium-2x",
  run: async (payload: IndividualPostData): Promise<PostResult> => {
    const {
      platform,
      media,
      caption,
      account,
      platformConfig,
      postId,
      stripeCustomerId,
      appCredentials,
      projectId,
    } = payload;
    let postResult: PostResult | null = null;
    try {
      await tags.add(`${account.id}`);

      logger.info("Starting post processing", { ...payload });

      logger.info("Creating Post Client");
      const postClient = createPostClient({
        supabaseClient: supabaseClient,
        platformName: platform,
        appCredentials,
      });

      if (
        platformsToAlwaysRefresh.includes(account.provider) ||
        differenceInDays(
          account.access_token_expires_at || new Date(),
          new Date()
        ) <= 7
      ) {
        logger.info("Refreshing Token", {
          platform: account.provider,
          account,
        });
        const refreshed = await handleTokenRefresh({
          postClient,
          account: account as SocialAccount,
        });

        if (!refreshed.success) {
          logger.error("Failed to refresh token", {
            account,
            error: refreshed.error,
          });
          postResult = {
            provider_connection_id: account.id,
            post_id: postId,
            success: false,
            error_message: refreshed.error,
          };

          throw new Error("Invalid Token");
        }
      }

      postResult = await postClient.post({
        postId,
        account,
        caption,
        media,
        platformConfig,
      });

      if (postResult.success) {
        try {
          logger.info("Increasing stripe meter", {
            meter: STRIPE_METER_EVENT,
            stripe_customer_id: stripeCustomerId,
          });
          const meterEvent = await stripe.billing.meterEvents.create({
            event_name: STRIPE_METER_EVENT,
            payload: {
              stripe_customer_id: stripeCustomerId,
            },
          });

          logger.info("Created meter event", { meterEvent });
        } catch (error) {
          logger.error("Failed to increase stripe meter", {
            meter: STRIPE_METER_EVENT,
            stripe_customer_id: stripeCustomerId,
            error,
          });
        }
      }
    } catch (error) {
      logger.error("Failed Processing Platform Post", { error });

      if (!postResult) {
        postResult = {
          provider_connection_id: account.id,
          success: false,
          error_message:
            "Unexcpted Error: Post Status Unavailable, Please check the social account.",
          post_id: postId,
          details: { error: error },
        };
      }
    }

    await tags.add(`result_${postResult.success ? "success" : "error"}`);

    logger.info("Saving Post Result", { postResult });
    const { data: insertedPostResult, error: insertResultError } =
      await supabaseClient
        .from("social_post_results")
        .insert(postResult)
        .select()
        .single();

    if (insertResultError) {
      logger.error("Failed to insert post result", { insertResultError });
    } else {
      await tasks.trigger("process-webhooks", {
        projectId: projectId,
        eventType: "social.post.result.created",
        eventData: {
          details: insertedPostResult.details,
          id: insertedPostResult.id,
          error: insertedPostResult.error_message,
          platform_data: {
            id: insertedPostResult.provider_post_id,
            url: insertedPostResult.provider_post_url,
          },
          post_id: insertedPostResult.post_id,
          social_account_id: insertedPostResult.provider_connection_id,
          success: insertedPostResult.success,
        },
      });
    }

    logger.info("Posting complete", { ...postResult });
    return postResult;
  },
});
