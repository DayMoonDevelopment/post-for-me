import { createClient } from "@supabase/supabase-js";
import { idempotencyKeys, logger, task, tags, tasks } from "@trigger.dev/sdk";
import { createPostClient } from "./posting/create-post-client";
import {
  handleTokenRefresh,
  platformsToAlwaysRefresh,
} from "./posting/token-refresh";

import {
  IndividualPostData,
  PostResult,
  SocialAccount,
} from "./posting/post.types";
import { differenceInDays } from "date-fns";
import Stripe from "stripe";
import { Database } from "./supabase.types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const STRIPE_METER_EVENT = process.env.STRIPE_METER_EVENT || "successful_post";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const postToPlatform = task({
  id: "post-to-platform",
  maxDuration: 3600,
  retry: {
    maxAttempts: 2,
    outOfMemory: {
      machine: "medium-2x",
    },
  },
  machine: "small-2x",
  run: async (payload: IndividualPostData): Promise<PostResult> => {
    const {
      platform,
      media,
      caption,
      account,
      platformConfig,
      postId,
      stripeCustomerId,
      teamId,
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
          new Date(),
        ) <= 7
      ) {
        logger.info("Refreshing Token", {
          platform: account.provider,
          account,
        });
        const refreshed = await handleTokenRefresh({
          supabaseClient,
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
      if (insertedPostResult.success) {
        void idempotencyKeys
          .create(["increment-team-usage", insertedPostResult.id], {
            scope: "global",
          })
          .then((idempotencyKey) =>
            tasks.trigger(
              "increment-team-usage",
              {
                stripe_customer_id: stripeCustomerId,
                team_id: teamId,
              },
              {
                idempotencyKey,
                idempotencyKeyTTL: "1h",
              },
            ),
          )
          .catch((error) => {
            logger.error("Failed to trigger increment team usage", {
              stripe_customer_id: stripeCustomerId,
              team_id: teamId,
              social_post_result_id: insertedPostResult.id,
              error,
            });
          });
      }

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

      const { error: postResultMediaError } = await supabaseClient
        .from("social_post_result_post_media")
        .insert(
          media.map((m) => ({
            social_post_result_id: insertedPostResult.id,
            social_post_media_id: m.id,
          })),
        );

      if (postResultMediaError) {
        logger.error("Failed to insert post result media", {
          postResultMediaError,
        });
      }
    }

    logger.info("Posting complete", { ...postResult });
    return postResult;
  },
});
