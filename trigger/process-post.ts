import { logger, task, tasks } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import type {
  IndividualPostData,
  PlatformAppCredentials,
  PlatformConfiguration,
  Post,
  PostResult,
} from "./posting/post.types";
import { Unkey } from "@unkey/api";

import { Database, Json } from "@post-for-me/db";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transformPostData = (data: {
  caption: string;
  created_at: string;
  external_id: string | null;
  id: string;
  post_at: string;
  project_id: string;
  status: Database["public"]["Enums"]["social_post_status"];
  updated_at: string;
  social_post_provider_connections: {
    social_provider_connections: {
      provider: string;
      id: string;
      social_provider_user_name: string | null | undefined;
      social_provider_user_id: string;
      access_token: string | null | undefined;
      refresh_token: string | null | undefined;
      access_token_expires_at: string | null | undefined;
      refresh_token_expires_at: string | null | undefined;
      external_id: string | null | undefined;
    };
  }[];
  social_post_media: {
    url: string;
    thumbnail_url: string | null;
    thumbnail_timestamp_ms: number | null;
    provider: string | null;
    provider_connection_id: string | null;
    tags?: Json;
  }[];
  social_post_configurations: {
    caption: string | null;
    provider: string | null;
    provider_connection_id: string | null;
    provider_data: any;
  }[];
}) => {
  const postMedia = data.social_post_media
    .filter((media) => !media.provider && !media.provider_connection_id)
    .map((media) => ({
      url: media.url,
      thumbnail_url: media.thumbnail_url,
      thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
      tags: media.tags as any[],
    }));

  const accountConfigurations = data.social_post_configurations
    .filter((config) => config.provider_connection_id)
    .map((config) => {
      const configData: PlatformConfiguration =
        config.provider_data as PlatformConfiguration;

      return {
        social_account_id: config.provider_connection_id!, //Social account id is always defined
        configuration: {
          caption: config.caption,
          media: data.social_post_media
            .filter((media) => media.provider_connection_id)
            .map((media) => ({
              url: media.url,
              thumbnail_url: media.thumbnail_url,
              thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
              tags: media.tags as any[],
            })),
          ...configData,
        },
      };
    });

  const platformConfigurations: any = {};

  data.social_post_configurations
    .filter((config) => config.provider)
    .map((config) => {
      platformConfigurations[config.provider!] = {
        caption: config.caption,
        media: data.social_post_media
          .filter((media) => media.provider_connection_id)
          .map((media) => ({
            url: media.url,
            thumbnail_url: media.thumbnail_url,
            thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
            tags: media.tags as any[],
          })),
        ...(config.provider_data as PlatformConfiguration),
      };
    });

  const socialAccounts = data.social_post_provider_connections.map(
    (connection) => ({
      id: connection.social_provider_connections.id,
      platform: connection.social_provider_connections.provider!,
      username:
        connection.social_provider_connections.social_provider_user_name,
      user_id: connection.social_provider_connections.social_provider_user_id,
      access_token: connection.social_provider_connections.access_token || "",
      refresh_token: connection.social_provider_connections.refresh_token,
      access_token_expires_at:
        connection.social_provider_connections.access_token_expires_at ||
        new Date().toISOString(),
      refresh_token_expires_at:
        connection.social_provider_connections.refresh_token_expires_at,
      external_id: connection.social_provider_connections.external_id,
    })
  );

  return {
    id: data.id,
    external_id: data.external_id,
    caption: data.caption,
    status: data.status,
    media: postMedia,
    platform_configurations: platformConfigurations,
    account_configurations: accountConfigurations,
    social_accounts: socialAccounts,
    scheduled_at: data.post_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

export const processPost = task({
  id: "process-post",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async (payload: {
    index: number;
    post: Post;
  }): Promise<PostResult[]> => {
    const { post } = payload;
    logger.info("Starting post processing", { post });

    logger.info("Getting post accounts");
    const accounts = post.social_post_provider_connections?.map(
      ({ social_provider_connections: connection }) => ({
        ...connection,
      })
    );

    const results: PostResult[] = [];

    try {
      if (!accounts || accounts.length === 0) {
        logger.error("No accounts found for post", { post });
        return [];
      }

      logger.info("Checking API Key is valid");
      const { result, error } = await unkey.keys.get({ keyId: post.api_key });

      if (error || !result.enabled) {
        logger.error("API Key is invalid", { key_result: result });
        results.push(
          ...accounts.map((connection) => ({
            success: false,
            provider_connection_id: connection.id,
            post_id: post.id,
            error_message: `API Key is invalid`,
          }))
        );
        throw new Error("API Key is invalid");
      }

      logger.info("Getting Stripe Customer Id");
      const { data: project, error: projectError } = await supabaseClient
        .from("projects")
        .select(
          `
        *, 
        teams(
         stripe_customer_id
        ),
        social_provider_app_credentials( 
         provider,
         app_id,
         app_secret
        )
        `
        )
        .eq("id", post.project_id)
        .single();

      if (projectError || !project?.teams?.stripe_customer_id) {
        logger.error("Project not found", { projectError, project });
        results.push(
          ...accounts.map((connection) => ({
            success: false,
            provider_connection_id: connection.id,
            post_id: post.id,
            error_message: `No project found`,
          }))
        );
        throw new Error("No project found");
      }

      const postMedia: {
        provider?: string | null;
        provider_connection_id?: string | null;
        url: string;
        thumbnail_url: string;
        thumbnail_timestamp_ms?: number | null;
        type: string;
      }[] = [];
      if (post.social_post_media && post.social_post_media.length > 0) {
        logger.info("Localizing Media", { media: post.social_post_media });

        const localizedMedia = await tasks.batchTriggerAndWait(
          "process-post-medium",
          post.social_post_media.map((medium) => ({
            payload: {
              medium: {
                provider: medium.provider,
                provider_connection_id: medium.provider_connection_id,
                url: medium.url,
                thumbnail_url: medium.thumbnail_url,
                thumbnail_timestamp_ms: medium.thumbnail_timestamp_ms,
              },
            },
          }))
        );

        logger.info("Localizing Media Complete", { localizedMedia });

        postMedia.push(
          ...localizedMedia.runs
            .filter((run) => run.ok)
            .map((run) => run.output)
        );

        const postVideos = postMedia.filter(
          (medium) => medium.type === "video"
        );

        if (postVideos.length > 0) {
          logger.info("Processing Videos");
          const processVideosResult = await tasks.batchTriggerAndWait(
            "ffmpeg-process-video",
            postVideos.map((video) => ({
              payload: {
                medium: video,
              },
            }))
          );

          logger.info("Processing Videos Complete", { processVideosResult });
        }

        if (postMedia.length == 0) {
          logger.error("All Media Failed");
          results.push(
            ...accounts.map((connection) => ({
              success: false,
              provider_connection_id: connection.id,
              post_id: post.id,
              error_message: `All media failed to process, please check media URLS`,
            }))
          );
          throw new Error("All media failed to process");
        }
      }

      logger.info("Constructing Post Data");

      const postData = {
        id: post.id,
        stripe_customer_id: project.teams.stripe_customer_id,
        caption: post.caption,
        configurations: post.social_post_configurations,
        media: postMedia,
        api_key: post.api_key,
        accounts: accounts,
      };

      logger.info("Constructed Post Data", { postData });

      const bulkPostData: IndividualPostData[] = [];
      for (const account of postData.accounts) {
        try {
          logger.info("Getting App Credentials");

          let appCredentials: PlatformAppCredentials | null = null;
          switch (account.provider) {
            case "bluesky":
              appCredentials = {
                app_id: "blue_sky_app_id",
                app_secret: "blue_sky_app_secret",
              } as PlatformAppCredentials;
              break;
            case "instagram":
              switch (account.social_provider_metadata?.connection_type) {
                case "instagram":
                  appCredentials = project.social_provider_app_credentials.find(
                    (credential) => credential.provider === "instagram"
                  ) as PlatformAppCredentials;
                  break;
                case "facebook":
                  appCredentials = project.social_provider_app_credentials.find(
                    (credential) =>
                      credential.provider === "instagram_w_facebook"
                  ) as PlatformAppCredentials;
                  break;
                default:
                  appCredentials = project.social_provider_app_credentials.find(
                    (credential) =>
                      credential.provider === account.provider ||
                      credential.provider === "instagram_w_facebook"
                  ) as PlatformAppCredentials;
                  break;
              }

              break;
            default:
              appCredentials = project.social_provider_app_credentials.find(
                (credential) => credential.provider === account.provider
              ) as PlatformAppCredentials;
              break;
          }

          if (!appCredentials) {
            logger.error("No App credentials found for provider", {
              provider: account.provider,
            });
            results.push({
              success: false,
              provider_connection_id: account.id,
              post_id: post.id,
              error_message: `No App credentials found for provider ${account.provider}`,
            });
            continue;
          }

          logger.info("Got App Credentials");

          logger.info("Creating Individual Post Configuration");
          const platformConfig = postData.configurations.filter(
            (config) => config.provider == account.provider
          )?.[0];
          const accountConfig = postData.configurations.filter(
            (config) => config.provider_connection_id == account.id
          )?.[0];
          const platformMedia = postData.media.filter(
            (medium) => medium.provider == account.provider
          );
          const accountMedia = postData.media.filter(
            (medium) => medium.provider_connection_id == account.id
          );
          const defaultMedia = postData.media.filter(
            (medium) => !medium.provider && !medium.provider_connection_id
          );

          logger.info("Procesing Configuration Data", {
            platformConfig,
            accountConfig,
            platformMedia,
            accountMedia,
            defaultMedia,
          });

          const caption =
            accountConfig?.caption ||
            platformConfig?.caption ||
            postData.caption;
          const media =
            accountMedia && accountMedia.length > 0
              ? accountMedia
              : platformConfig && platformMedia.length > 0
                ? platformMedia
                : defaultMedia;

          const platformData = {
            ...platformConfig?.provider_data,
            ...accountConfig?.provider_data,
          } as PlatformConfiguration;

          bulkPostData.push({
            stripeCustomerId: postData.stripe_customer_id,
            platform: account.provider,
            postId: postData.id,
            account,
            media,
            caption,
            platformConfig: platformData,
            appCredentials,
          });

          logger.info("Created Indidividual Post Configuration");
        } catch (error: any) {
          logger.error("Failed Posting To Account", {
            account,
            postData,
            error,
          });

          results.push({
            success: false,
            error_message: error?.message || "Unkown error",
            provider_connection_id: account.id,
            post_id: postData.id,
            details: { error },
          });
        }
      }

      logger.info("Posting To Accounts", { bulkPostData });
      const batchPostResult = await tasks.batchTriggerAndWait(
        "post-to-platform",
        bulkPostData.map((data) => ({ payload: data }))
      );

      logger.info("Posting To Accounts Complete", { batchPostResult });

      results.push(
        ...batchPostResult.runs.filter((run) => run.ok).map((run) => run.output)
      );

      logger.info("Checking Post Results");
      const accountsWithResults = results.map(
        (result) => result.provider_connection_id
      );

      const missingAccounts = postData.accounts.filter(
        (account) => !accountsWithResults.includes(account.id)
      );

      if (missingAccounts && missingAccounts.length > 0) {
        logger.info("Found Missing Post Results", { missingAccounts });

        logger.info("Adding Failed Post Results For Missing Accounts");
        results.push(
          ...missingAccounts.map((account) => ({
            provider_connection_id: account.id,
            error_message:
              "Post Status Unavailable, Please check the social account.",
            success: false,
            post_id: postData.id,
          }))
        );
      }
    } catch (error) {
      logger.error("Unexpected Error", { error });
    } finally {
      logger.info("Saving Post Results", { results });
      const { error: insertResultsError } = await supabaseClient
        .from("social_post_results")
        .insert(results);

      if (insertResultsError) {
        logger.error("Failed to insert post results", { insertResultsError });
      }

      logger.info("Updating Post Status");
      const { data: updatedPost, error: updatePostError } = await supabaseClient
        .from("social_posts")
        .update({
          status: "processed",
        })
        .eq("id", post.id)
        .select(
          `
        *,
        social_post_provider_connections (
          social_provider_connections (
            *
          )
        ),
        social_post_media (
          url,
          thumbnail_url,
          thumbnail_timestamp_ms,
          provider,
          provider_connection_id,
          tags
        ),
        social_post_configurations (
         caption,
         provider,
         provider_connection_id,
         provider_data
        )
        `
        )
        .single();

      if (updatePostError) {
        logger.error("Failed to update post status", { updatePostError });
      }

      const webhookEvents = results.map((r) => ({
        payload: {
          projectId: post.project_id,
          eventType: "social.post.result.created",
          eventData: r,
        },
      }));
      await tasks.batchTrigger("process-webhooks", webhookEvents);

      if (updatedPost) {
        await tasks.trigger("process-webhooks", {
          projectId: post.project_id,
          eventType: "social.post.updated",
          eventData: transformPostData(updatedPost),
        });
      }

      return results;
    }
  },
});
