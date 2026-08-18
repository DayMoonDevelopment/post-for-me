import { logger, task, tasks, tags, wait } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import type {
  IndividualPostData,
  PlatformAppCredentials,
  PlatformConfiguration,
  Post,
  PostMedia,
  PostResult,
  Provider,
  SocialAccount,
  UserTag,
} from "./posting/post.types";
import { Unkey } from "@unkey/api";

const CHAIN_CAPABLE_PROVIDERS: Provider[] = ["x", "threads", "bluesky"];

import { Database, Json } from "./supabase.types";

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
  social_post_chain_items?: {
    sequence: number;
    caption: string;
    social_post_chain_item_media: {
      url: string;
      thumbnail_url: string | null;
      thumbnail_timestamp_ms: number | null;
      tags: Json;
      skip_processing: boolean | null;
    }[];
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
    }),
  );

  const chain = [...(data.social_post_chain_items ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((item) => ({
      caption: item.caption,
      media: item.social_post_chain_item_media.map((media) => ({
        url: media.url,
        thumbnail_url: media.thumbnail_url,
        thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
        tags: media.tags as any[],
        skip_processing: media.skip_processing,
      })),
    }));

  return {
    id: data.id,
    external_id: data.external_id,
    caption: data.caption,
    status: data.status,
    media: postMedia,
    platform_configurations: platformConfigurations,
    account_configurations: accountConfigurations,
    social_accounts: socialAccounts,
    chain: chain.length > 0 ? chain : null,
    scheduled_at: data.post_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

interface LocalizedMedia extends PostMedia {
  provider?: string | null;
  provider_connection_id?: string | null;
}

const localizeMedia = async (
  media: {
    id: string;
    provider?: string | null;
    provider_connection_id?: string | null;
    url: string;
    thumbnail_url: string | null;
    thumbnail_timestamp_ms: number | null;
    tags?: UserTag[] | null;
    skip_processing?: boolean | null;
  }[],
): Promise<LocalizedMedia[]> => {
  const postMedia: LocalizedMedia[] = [];

  if (!media || media.length === 0) {
    return postMedia;
  }

  logger.info("Localizing Media", { media });

  const localizedMedia = await tasks.batchTriggerAndWait(
    "process-post-medium",
    media.map((medium) => ({
      payload: {
        medium: {
          id: medium.id,
          provider: medium.provider,
          provider_connection_id: medium.provider_connection_id,
          url: medium.url,
          thumbnail_url: medium.thumbnail_url,
          thumbnail_timestamp_ms: medium.thumbnail_timestamp_ms,
          tags: medium.tags,
          skip_processing: medium.skip_processing,
        },
      },
    })),
  );

  logger.info("Localizing Media Complete", { localizedMedia });

  const succesfulMedia = localizedMedia.runs
    .filter((run) => run.ok)
    .map((run) => run.output);

  const postImages = succesfulMedia.filter(
    (medium) => medium.type !== "video",
  );
  const postVideos = succesfulMedia.filter(
    (medium) => medium.type === "video",
  );

  postMedia.push(...postImages);
  postMedia.push(...postVideos.filter((m) => m.skip_processing));

  const videosToProcess = postVideos.filter((m) => !m.skip_processing);

  if (videosToProcess.length > 0) {
    logger.info("Processing Videos");
    const processVideosResult = await tasks.batchTriggerAndWait(
      "ffmpeg-process-video",
      videosToProcess.map((video) => ({
        payload: {
          medium: video,
        },
      })),
    );

    logger.info("Processing Videos Complete", { processVideosResult });

    postMedia.push(
      ...processVideosResult.runs
        .filter((run) => run.ok)
        .map((run) => run.output),
    );

    logger.info("Updated post media with processed video URLs", {
      postMedia,
    });
  }

  return postMedia;
};

const buildReplyPlatformConfig = (
  provider: string,
  previousResult: PostResult,
  rootResult: PostResult,
): PlatformConfiguration => {
  switch (provider) {
    case "x":
      return { in_reply_to_tweet_id: previousResult.provider_post_id };
    case "threads":
      return { reply_to_id: previousResult.provider_post_id };
    case "bluesky":
      return {
        reply: {
          root: {
            uri: rootResult.provider_post_id!,
            cid: rootResult.details?.cid,
          },
          parent: {
            uri: previousResult.provider_post_id!,
            cid: previousResult.details?.cid,
          },
        },
      };
    default:
      return {};
  }
};

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

const UNKEY_MAX_RETRIES = 3;

export const processPost = task({
  id: "process-post",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async (payload: { index: number; post: Post }) => {
    const { post } = payload;
    logger.info("Starting post processing", { post });

    await tags.add([`${post.id}`, `${post.project_id}`]);

    logger.info("Getting post accounts");
    const accounts = post.social_post_provider_connections?.map(
      ({ social_provider_connections: connection }) => ({
        ...connection,
      }),
    );

    const errorResults: PostResult[] = [];

    try {
      if (!accounts || accounts.length === 0) {
        logger.error("No accounts found for post", { post });
        return [];
      }

      logger.info("Checking API Key is valid");
      let apiKeyEnabled = false;

      for (let retryCount = 0; retryCount <= UNKEY_MAX_RETRIES; retryCount++) {
        try {
          const { data } = await unkey.keys.getKey({ keyId: post.api_key });

          apiKeyEnabled = data.enabled;
          logger.info("Found API Key", { data });
          break;
        } catch (error) {
          apiKeyEnabled = false;
          const hasRetriesLeft = retryCount < UNKEY_MAX_RETRIES;
          const delaySeconds = 2 ** retryCount;

          logger.warn("Unkey API key validation failed, retrying", {
            retryAttempt: retryCount + 1,
            maxRetries: UNKEY_MAX_RETRIES,
            delaySeconds,
            error,
          });

          if (hasRetriesLeft) {
            await wait.for({ seconds: delaySeconds });
          }
        }
      }

      if (!apiKeyEnabled) {
        logger.error("API Key is invalid");
        errorResults.push(
          ...accounts.map((connection) => ({
            success: false,
            provider_connection_id: connection.id,
            post_id: post.id,
            error_message: `API Key is invalid`,
          })),
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
        `,
        )
        .eq("id", post.project_id)
        .single();

      if (projectError || !project?.teams?.stripe_customer_id) {
        logger.error("Project not found", { projectError, project });
        errorResults.push(
          ...accounts.map((connection) => ({
            success: false,
            provider_connection_id: connection.id,
            post_id: post.id,
            error_message: `No project found`,
          })),
        );
        throw new Error("No project found");
      }

      await tags.add(`${project.team_id}`);
      const postMedia = await localizeMedia(post.social_post_media ?? []);

      if (
        post.social_post_media &&
        post.social_post_media.length > 0 &&
        postMedia.length === 0
      ) {
        logger.error("All Media Failed");
        errorResults.push(
          ...accounts.map((connection) => ({
            success: false,
            provider_connection_id: connection.id,
            post_id: post.id,
            error_message: `All media failed to process, please check media URLS`,
          })),
        );
        throw new Error("All media failed to process");
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

      const chainItems = [...(post.social_post_chain_items ?? [])].sort(
        (a, b) => a.sequence - b.sequence,
      );

      const bulkPostData: IndividualPostData[] = [];
      const storyBulkPostData: IndividualPostData[] = [];
      const chainAccounts: {
        account: SocialAccount;
        appCredentials: PlatformAppCredentials;
      }[] = [];
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
                    (credential) => credential.provider === "instagram",
                  ) as PlatformAppCredentials;
                  break;
                case "facebook":
                  appCredentials = project.social_provider_app_credentials.find(
                    (credential) =>
                      credential.provider === "instagram_w_facebook",
                  ) as PlatformAppCredentials;
                  break;
                default:
                  appCredentials = project.social_provider_app_credentials.find(
                    (credential) =>
                      credential.provider === account.provider ||
                      credential.provider === "instagram_w_facebook",
                  ) as PlatformAppCredentials;
                  break;
              }

              break;
            case "x":
              appCredentials = project.social_provider_app_credentials.find(
                (credential) =>
                  credential.provider ===
                  (account.social_provider_metadata?.connection_type ===
                  "oauth2"
                    ? "x_oauth2"
                    : "x"),
              ) as PlatformAppCredentials;
              break;
            default:
              appCredentials = project.social_provider_app_credentials.find(
                (credential) => credential.provider === account.provider,
              ) as PlatformAppCredentials;
              break;
          }

          if (!appCredentials) {
            logger.error("No App credentials found for provider", {
              provider: account.provider,
            });
            errorResults.push({
              success: false,
              provider_connection_id: account.id,
              post_id: post.id,
              error_message: `No App credentials found for provider ${account.provider}`,
            });
            continue;
          }

          logger.info("Got App Credentials");

          if (
            chainItems.length > 0 &&
            CHAIN_CAPABLE_PROVIDERS.includes(account.provider)
          ) {
            chainAccounts.push({ account, appCredentials });
          }

          logger.info("Creating Individual Post Configuration");
          const platformConfig = postData.configurations.filter(
            (config) => config.provider == account.provider,
          )?.[0];
          const accountConfig = postData.configurations.filter(
            (config) => config.provider_connection_id == account.id,
          )?.[0];
          const platformMedia = postData.media.filter(
            (medium) => medium.provider == account.provider,
          );
          const accountMedia = postData.media.filter(
            (medium) => medium.provider_connection_id == account.id,
          );
          const defaultMedia = postData.media.filter(
            (medium) => !medium.provider && !medium.provider_connection_id,
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

          const isStoryPlacement =
            (platformData as { placement?: string }).placement === "stories";

          if (isStoryPlacement) {
            for (const medium of media) {
              storyBulkPostData.push({
                stripeCustomerId: postData.stripe_customer_id,
                teamId: project.team_id,
                platform: account.provider,
                postId: postData.id,
                account,
                media: [medium],
                caption,
                platformConfig: platformData,
                appCredentials,
                projectId: post.project_id,
              });
            }
          } else {
            bulkPostData.push({
              stripeCustomerId: postData.stripe_customer_id,
              teamId: project.team_id,
              platform: account.provider,
              postId: postData.id,
              account,
              media,
              caption,
              platformConfig: platformData,
              appCredentials,
              projectId: post.project_id,
            });
          }

          logger.info("Created Indidividual Post Configuration");
        } catch (error: any) {
          logger.error("Failed Posting To Account", {
            account,
            postData,
            error,
          });

          errorResults.push({
            success: false,
            error_message: error?.message || "Unkown error",
            provider_connection_id: account.id,
            post_id: postData.id,
            details: { error },
          });
        }
      }

      const rootResultsByAccountId = new Map<string, PostResult>();

      if (bulkPostData.length > 0) {
        logger.info("Posting To Accounts", { bulkPostData });
        const batchPostResult = await tasks.batchTriggerAndWait(
          "post-to-platform",
          bulkPostData.map((data) => ({ payload: data })),
        );

        logger.info("Posting To Accounts Complete", { batchPostResult });

        bulkPostData.forEach((data, index) => {
          const run = batchPostResult.runs[index];
          if (run?.ok) {
            rootResultsByAccountId.set(data.account.id, run.output);
          }
        });
      }

      if (storyBulkPostData.length > 0) {
        logger.info("Posting Story Media Sequentially", {
          totalStoryPosts: storyBulkPostData.length,
        });

        for (const [index, storyPostData] of storyBulkPostData.entries()) {
          logger.info("Posting Story Media", {
            current: index + 1,
            total: storyBulkPostData.length,
            provider: storyPostData.platform,
            provider_connection_id: storyPostData.account.id,
          });

          const storyPostResult = await tasks.triggerAndWait(
            "post-to-platform",
            storyPostData,
          );

          logger.info("Posting Story Media Complete", {
            current: index + 1,
            total: storyBulkPostData.length,
            provider: storyPostData.platform,
            provider_connection_id: storyPostData.account.id,
            success: storyPostResult.ok,
          });
        }
      }

      if (chainAccounts.length > 0) {
        logger.info("Posting Chain Items Sequentially", {
          totalChainAccounts: chainAccounts.length,
          chainLength: chainItems.length,
        });

        // Localize every chain item's media once up front (it doesn't vary
        // by account, unlike root-post media), instead of re-localizing it
        // once per chain-capable account.
        const localizedChainMedia = await localizeMedia(
          chainItems.flatMap((item) => item.social_post_chain_item_media),
        );
        const localizedChainMediaById = new Map(
          localizedChainMedia.map((medium) => [medium.id, medium]),
        );
        const itemMediaById = new Map(
          chainItems.map((item) => [
            item.id,
            item.social_post_chain_item_media
              .map((medium) => localizedChainMediaById.get(medium.id))
              .filter(
                (medium): medium is LocalizedMedia => medium !== undefined,
              ),
          ]),
        );
        const failedMediaItemIds = new Set(
          chainItems
            .filter(
              (item) =>
                item.social_post_chain_item_media.length > 0 &&
                (itemMediaById.get(item.id)?.length ?? 0) === 0,
            )
            .map((item) => item.id),
        );

        for (const { account, appCredentials } of chainAccounts) {
          const rootResult = rootResultsByAccountId.get(account.id);

          if (!rootResult?.success) {
            logger.warn("Skipping chain: root post did not succeed", {
              provider: account.provider,
              provider_connection_id: account.id,
            });
            errorResults.push(
              ...chainItems.map((item) => ({
                success: false,
                provider_connection_id: account.id,
                post_id: postData.id,
                chain_item_id: item.id,
                error_message: `Skipped chain item: root post did not succeed for ${account.provider}`,
              })),
            );
            continue;
          }

          let previousResult: PostResult = rootResult;
          const rootRef: PostResult = rootResult;
          let chainBroken = false;

          for (const item of chainItems) {
            if (chainBroken) {
              errorResults.push({
                success: false,
                provider_connection_id: account.id,
                post_id: postData.id,
                chain_item_id: item.id,
                error_message: `Skipped chain item: an earlier item in the chain failed for ${account.provider}`,
              });
              continue;
            }

            try {
              if (failedMediaItemIds.has(item.id)) {
                logger.error("All Chain Item Media Failed", {
                  provider_connection_id: account.id,
                  chain_item_id: item.id,
                });
                errorResults.push({
                  success: false,
                  provider_connection_id: account.id,
                  post_id: postData.id,
                  chain_item_id: item.id,
                  error_message: `All media failed to process for chain item, please check media URLS`,
                });
                chainBroken = true;
                continue;
              }

              // Re-fetch the account on every chain item: an earlier item
              // (or the root post) may have refreshed and persisted a new
              // access/refresh token, and platforms like X rotate the OAuth2
              // refresh_token on every use, so a stale in-memory `account`
              // would fail to refresh again.
              const { data: freshAccountRow, error: freshAccountError } =
                await supabaseClient
                  .from("social_provider_connections")
                  .select("*")
                  .eq("id", account.id)
                  .single();

              if (freshAccountError || !freshAccountRow) {
                logger.warn(
                  "Failed to refresh account before chain item, reusing last known token",
                  {
                    provider_connection_id: account.id,
                    error: freshAccountError,
                  },
                );
              }

              const currentAccount: SocialAccount = freshAccountRow
                ? (freshAccountRow as unknown as SocialAccount)
                : account;

              const itemMedia = itemMediaById.get(item.id) ?? [];

              const platformConfig = buildReplyPlatformConfig(
                account.provider,
                previousResult,
                rootRef,
              );

              logger.info("Posting Chain Item", {
                provider: account.provider,
                provider_connection_id: account.id,
                sequence: item.sequence,
              });

              const result = await tasks.triggerAndWait("post-to-platform", {
                stripeCustomerId: postData.stripe_customer_id,
                teamId: project.team_id,
                platform: account.provider,
                postId: postData.id,
                account: currentAccount,
                media: itemMedia,
                caption: item.caption,
                platformConfig,
                appCredentials,
                projectId: post.project_id,
                chainItemId: item.id,
              });

              logger.info("Posting Chain Item Complete", {
                provider: account.provider,
                provider_connection_id: account.id,
                sequence: item.sequence,
                success: result.ok && result.output.success,
              });

              if (result.ok && result.output.success) {
                previousResult = result.output;
              } else {
                chainBroken = true;
                if (!result.ok) {
                  errorResults.push({
                    success: false,
                    provider_connection_id: account.id,
                    post_id: postData.id,
                    chain_item_id: item.id,
                    error_message:
                      "post-to-platform run failed unexpectedly for chain item",
                  });
                }
              }
            } catch (error: any) {
              logger.error("Failed Posting Chain Item", {
                account,
                item,
                error,
              });
              errorResults.push({
                success: false,
                provider_connection_id: account.id,
                post_id: postData.id,
                chain_item_id: item.id,
                error_message: error?.message || "Unknown error",
                details: { error },
              });
              chainBroken = true;
            }
          }
        }
      }
    } catch (error) {
      logger.error("Unexpected Error", { error });
    } finally {
      if (errorResults && errorResults.length > 0) {
        logger.info("Saving Post Results", { errorResults });
        const { data: insertedPostResults, error: insertResultsError } =
          await supabaseClient
            .from("social_post_results")
            .insert(errorResults)
            .select();

        if (insertResultsError) {
          logger.error("Failed to insert post results", { insertResultsError });
        } else {
          const webhookEvents = insertedPostResults.map((r) => ({
            payload: {
              projectId: post.project_id,
              eventType: "social.post.result.created",
              eventData: {
                details: r.details,
                id: r.id,
                error: r.error_message,
                platform_data: {
                  id: r.provider_post_id,
                  url: r.provider_post_url,
                },
                post_id: r.post_id,
                chain_item_id: r.chain_item_id,
                social_account_id: r.provider_connection_id,
                success: r.success,
              },
            },
          }));
          await tasks.batchTrigger("process-webhooks", webhookEvents);
        }
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
        ),
        social_post_chain_items (
          id,
          sequence,
          caption,
          social_post_chain_item_media (
            id,
            url,
            thumbnail_url,
            thumbnail_timestamp_ms,
            tags,
            skip_processing
          )
        )
        `,
        )
        .single();

      if (updatePostError) {
        logger.error("Failed to update post status", { updatePostError });
      }

      if (updatedPost) {
        await tasks.trigger("process-webhooks", {
          projectId: post.project_id,
          eventType: "social.post.updated",
          eventData: transformPostData(updatedPost),
        });
      }
    }
  },
});
