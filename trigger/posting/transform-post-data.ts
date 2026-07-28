import type { PlatformConfiguration } from "./post.types";
import type { Database, Json } from "../supabase.types";
import { connectionSupportsDelete } from "./delete-capability";

/**
 * Maps a raw `social_posts` row (with its provider-connection, media and
 * configuration relations) into the public post shape used for
 * `social.post.*` webhook payloads. Shared by process-post (`social.post.updated`)
 * and delete-from-platform (`social.post.deleted`) so every post-level webhook
 * emits an identical schema.
 */
export const transformPostData = (data: {
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
      social_provider_metadata?: Json;
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
    (connection) => {
      const metadata = connection.social_provider_connections
        .social_provider_metadata as {
        connection_type?: string;
        granted_scopes?: string[];
      } | null;

      return {
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
        delete_supported: connectionSupportsDelete({
          provider: connection.social_provider_connections.provider,
          connectionType: metadata?.connection_type,
          grantedScopes: metadata?.granted_scopes,
        }),
      };
    },
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
