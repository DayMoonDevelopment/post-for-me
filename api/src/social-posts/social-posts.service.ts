import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { differenceInMinutes } from 'date-fns';
import { SocialPostDto, PostStatus } from './dto/post.dto';
import type { CreateSocialPostDto } from './dto/create-post.dto';
import { SocialPostQueryDto } from './dto/post-query.dto';

import type { PaginatedRequestQuery } from '../pagination/pagination-request.interface';
import { DeleteEntityResponseDto } from '../lib/dto/global.dto';
import { tasks } from '@trigger.dev/sdk/v3';
import type { Provider } from '../lib/dto/global.dto';
import {
  PlatformConfiguration,
  PlatformConfigurationsDto,
} from './dto/post-configurations.dto';
import { Database, Json } from '@post-for-me/db';
import { PostValidation } from './dto/post-validation.dto';
import { SocialPostMetersService } from '../social-post-meters/social-post-meters.service';

import { AppLogger } from '../logger/app-logger';

type ProviderTypeEnum = Database['public']['Enums']['social_provider'];

type PostStatusEnum = Database['public']['Enums']['social_post_status'];

@Injectable()
export class SocialPostsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly socialPostMetersService: SocialPostMetersService,
    private readonly logger: AppLogger,
  ) {}

  async getPostData(postId: string): Promise<any> {
    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async validatePost({
    post,
    projectId,
    teamId,
    isSystem,
  }: {
    post: CreateSocialPostDto;
    projectId: string;
    teamId: string;
    isSystem: boolean;
  }): Promise<PostValidation> {
    if (!post) {
      return {
        isValid: false,
        errors: ['please provide a request body'],
      };
    }

    const errors: string[] = [];
    const providers: string[] = [];

    if (!post.caption) {
      errors.push('caption is required');
    }

    if (!post.social_accounts) {
      errors.push('at least one social_account is required');
    } else {
      const { data, error } = await this.supabaseService.supabaseClient
        .from('social_provider_connections')
        .select('*')
        .in('id', post.social_accounts)
        .eq('project_id', projectId);

      if (error) {
        errors.push(error.message);
      }

      if (!data || data.length != post.social_accounts.length) {
        errors.push('invalid social accounts, not owned by user');
      } else {
        providers.push(...data.map((d) => d.provider));
      }
    }

    if (
      post.scheduled_at &&
      differenceInMinutes(post.scheduled_at, new Date()) < 0
    ) {
      errors.push('scheduled_at must be in the future');
    }

    // Validate media URLs
    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        const urlValidation = this.validateMediaUrl(media.url);
        errors.push(...urlValidation);

        if (media.thumbnail_url) {
          const thumbnailValidation = this.validateMediaUrl(
            media.thumbnail_url,
          );
          errors.push(...thumbnailValidation);
        }
      }
    }

    // Validate platform configuration media URLs
    if (post.platform_configurations) {
      for (const [provider, config] of Object.entries(
        post.platform_configurations,
      )) {
        const platformConfig = config as PlatformConfiguration;
        if (platformConfig.media) {
          for (const media of platformConfig.media) {
            const urlValidation = this.validateMediaUrl(media.url);
            errors.push(...urlValidation.map((e) => `${provider}: ${e}`));

            if (media.thumbnail_url) {
              const thumbnailValidation = this.validateMediaUrl(
                media.thumbnail_url,
              );
              errors.push(
                ...thumbnailValidation.map((e) => `${provider}: ${e}`),
              );
            }
          }
        }
      }
    }

    // Validate account configuration media URLs
    if (Array.isArray(post.account_configurations)) {
      for (const accountConfig of post.account_configurations) {
        if (accountConfig?.configuration?.media) {
          for (const media of accountConfig.configuration.media) {
            const urlValidation = this.validateMediaUrl(media.url);
            errors.push(
              ...urlValidation.map(
                (e) => `account ${accountConfig.social_account_id}: ${e}`,
              ),
            );

            if (media.thumbnail_url) {
              const thumbnailValidation = this.validateMediaUrl(
                media.thumbnail_url,
              );
              errors.push(
                ...thumbnailValidation.map(
                  (e) => `account ${accountConfig.social_account_id}: ${e}`,
                ),
              );
            }
          }
        }
      }
    }

    if (isSystem && errors.length === 0) {
      for (const socialAccountProvider of providers) {
        const hasMetLimit = await this.socialPostMetersService.hasMetLimit({
          teamId,
          provider: socialAccountProvider,
          scheduledDate: post.scheduled_at || new Date(),
        });

        if (hasMetLimit) {
          errors.push(
            `You have reached the post limit for ${socialAccountProvider}, please try again for a different date/time`,
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateMediaUrl(url: string): string[] {
    // Check if the URL is valid
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return [`invalid media URL: ${url}`];
    }

    // Check if protocol is http or https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return [`media URL must use http or https protocol: ${url}`];
    }

    // Check for localhost
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('localhost:') ||
      hostname.endsWith('.localhost')
    ) {
      return [`media URL cannot point to localhost: ${url}`];
    }

    // Check for IP addresses (IPv4 and IPv6)
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^\[?([0-9a-fA-F:]+)\]?$/;

    if (ipv4Regex.test(hostname) || ipv6Regex.test(hostname)) {
      return [`media URL cannot use IP addresses: ${url}`];
    }

    // Check for private IP ranges
    const ipv4Match = hostname.match(ipv4Regex);
    if (ipv4Match) {
      const parts = hostname.split('.').map(Number);
      const isPrivate =
        parts[0] === 10 || // 10.0.0.0/8
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
        (parts[0] === 192 && parts[1] === 168); // 192.168.0.0/16

      if (isPrivate) {
        return [`media URL cannot point to private IP addresses: ${url}`];
      }
    }

    return [];
  }

  validatePostCaptionLength({
    caption,
    platform,
  }: {
    caption: string;
    platform: string;
  }): { isValid: boolean; error: string } {
    const maxCaptionLength = 2200;

    switch (platform) {
      default:
        return {
          isValid: caption.length <= maxCaptionLength,
          error: `caption must be less than ${maxCaptionLength} characters`,
        };
    }
  }

  async createPost({
    post,
    projectId,
    teamId,
    apiKey,
    isSystem,
    postId,
  }: {
    post: CreateSocialPostDto;
    projectId: string;
    apiKey: string;
    teamId: string;
    isSystem: boolean;
    postId?: string;
  }): Promise<SocialPostDto | null> {
    let status: string;
    if (post.isDraft !== undefined && post.isDraft) {
      status = 'draft';
    } else {
      status = post.scheduled_at ? 'scheduled' : 'processing';
    }

    const postToInsert: {
      caption: any;
      post_at: any;
      project_id: string;
      status: 'draft' | 'scheduled' | 'processing';
      external_id: any;
      api_key: string;
      id?: string;
    } = {
      caption: post.caption,
      post_at: post.scheduled_at?.toISOString(),
      project_id: projectId,
      status: status as 'draft' | 'scheduled' | 'processing',
      external_id: post.external_id,
      api_key: apiKey,
    };

    if (postId) {
      postToInsert.id = postId;
    }

    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_posts')
      .insert(postToInsert)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const postSocialAccounts = post.social_accounts.map((socialAccountId) => ({
      post_id: data.id,
      provider_connection_id: socialAccountId,
    }));

    const insertedAccounts = await this.supabaseService.supabaseClient
      .from('social_post_provider_connections')
      .insert(postSocialAccounts)
      .select('*, social_provider_connections(provider)');

    const postMedia: {
      url: string;
      thumbnail_url?: string | undefined | null;
      thumbnail_timestamp_ms?: number | undefined | null;
      post_id: string;
      provider_connection_id?: string | undefined;
      provider?: Provider;
      skip_processing?: boolean | null;
    }[] = [];

    const postConfigurations: {
      caption?: string | null;
      provider?: Provider;
      provider_connection_id?: string;
      post_id: string;
      provider_data?: PlatformConfiguration | null;
    }[] = [];

    if (post.media) {
      postMedia.push(
        ...post.media.map((media) => {
          return {
            url: media.url,
            thumbnail_url: media.thumbnail_url,
            thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
            post_id: data.id,
            tags: media.tags,
            skip_processing: media.skip_processing,
          };
        }),
      );
    }

    if (post.platform_configurations) {
      Object.entries(post.platform_configurations).forEach(
        ([provider, config]: [
          string,
          {
            media?: {
              url: string;
              thumbnail_url?: string;
              thumbnail_timestamp_ms?: number;
              tags: any[];
              skip_processing?: boolean | null;
            }[];
          },
        ]) => {
          if (config.media) {
            postMedia.push(
              ...(config.media.map((media) => ({
                url: media.url,
                thumbnail_url: media.thumbnail_url,
                thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
                tags: media.tags,
                skip_processing: media.skip_processing,
                post_id: data.id,
                provider: provider as Provider,
              })) as Array<{
                url: string;
                thumbnail_url?: string;
                thumbnail_timestamp_ms?: number;
                post_id: string;
                tags: any[];
                skip_processing?: boolean | null;
                provider: Provider;
              }>),
            );
          }
          const platformConfig = config as PlatformConfiguration;

          postConfigurations.push({
            caption: platformConfig.caption,
            provider: provider as Provider,
            post_id: data.id,
            provider_data: platformConfig,
          });
        },
      );
    }

    if (Array.isArray(post.account_configurations)) {
      for (const accountConfig of post.account_configurations) {
        const platformConfig = accountConfig?.configuration;
        if (!platformConfig) {
          continue;
        }

        if (platformConfig.media) {
          postMedia.push(
            ...platformConfig.media.map((media) => ({
              url: media.url,
              thumbnail_url: media.thumbnail_url,
              thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
              post_id: data.id,
              provider_connection_id: accountConfig.social_account_id,
              tags: media.tags,
              skip_processing: media.skip_processing,
            })),
          );
        }

        postConfigurations.push({
          caption: platformConfig.caption,
          provider_connection_id: accountConfig.social_account_id,
          post_id: data.id,
          provider_data: platformConfig,
        });
      }
    }

    const { error: insertPostMediaError } =
      await this.supabaseService.supabaseClient
        .from('social_post_media')
        .insert(postMedia);

    if (insertPostMediaError) {
      this.logger.errorWithMeta(
        'failed to insert social_post_media',
        undefined,
        {
          postId: data.id,
          projectId,
          supabase_error: insertPostMediaError,
          media_count: postMedia.length,
        },
      );
    }

    const { error: insertPostConfigurationsError } =
      await this.supabaseService.supabaseClient
        .from('social_post_configurations')
        .insert(
          postConfigurations.map((config) => {
            const postConfigData: {
              post_id: string;
              provider?: Provider;
              provider_connection_id?: string | undefined | null;
              provider_data: any;
              caption?: string | undefined | null;
            } = {
              post_id: config.post_id,

              provider_data: { ...config.provider_data },
            };

            if (config.caption) {
              postConfigData.caption = config.caption;
            }

            if (config.provider_connection_id) {
              postConfigData.provider_connection_id =
                config.provider_connection_id;
            }

            if (config.provider) {
              postConfigData.provider = config.provider;
            }

            return postConfigData;
          }),
        );

    if (insertPostConfigurationsError) {
      this.logger.errorWithMeta(
        'failed to insert social_post_configurations',
        undefined,
        {
          postId: data.id,
          projectId,
          supabase_error: insertPostConfigurationsError,
          config_count: postConfigurations.length,
        },
      );
    }

    if (data.status === 'processing') {
      await this.triggerPost(data.id);
    }

    if (isSystem && insertedAccounts.data) {
      const insertDate = new Date();
      const incrementMeters = insertedAccounts.data.map((account) => {
        return this.socialPostMetersService.incrementSocialPostMeter({
          teamId,
          provider: account.social_provider_connections.provider,
          scheduledDate: post.scheduled_at || insertDate,
        });
      });

      await Promise.all(incrementMeters);
    }

    return this.getPostById(data.id, projectId);
  }

  async getPostById(
    postId: string,
    projectId: string,
  ): Promise<SocialPostDto | null> {
    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_posts')
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
          tags,
          skip_processing
        ),
        social_post_configurations (
         caption,
         provider,
         provider_connection_id,
         provider_data
        )
        `,
      )
      .eq('id', postId)
      .eq('project_id', projectId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const postData: SocialPostDto = this.transformPostData(data);

    return postData;
  }

  async buildPostQuery(
    queryParams: SocialPostQueryDto,
    projectId: string,
  ): PaginatedRequestQuery<SocialPostDto> {
    const { offset, limit, platform, status, external_id, social_account_id } =
      queryParams;

    const query = this.supabaseService.supabaseClient
      .from('social_posts')
      .select(
        `
        *,
        social_post_provider_connections!inner (
          social_provider_connections!inner (
            *
          )
        ),
        social_post_media (
          url,
          thumbnail_url,
          thumbnail_timestamp_ms,
          provider,
          provider_connection_id,
          tags,
          skip_processing
        ),
        social_post_configurations (
         caption,
         provider,
         provider_connection_id,
         provider_data
        )
        `,
        { count: 'exact', head: false },
      )
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);

    if (platform) {
      const values: string[] = [];

      switch (true) {
        case typeof platform === 'string': {
          values.push(...(platform as string).split(','));
          break;
        }
        case Array.isArray(platform):
          values.push(...platform);
          break;
        default:
          values.push(platform);
          break;
      }

      query.in(
        'social_post_provider_connections.social_provider_connections.provider',
        values.map((v) => v as ProviderTypeEnum),
      );
    }

    if (social_account_id) {
      const values: string[] = [];

      switch (true) {
        case typeof social_account_id === 'string': {
          values.push(...(social_account_id as string).split(','));
          break;
        }
        case Array.isArray(social_account_id):
          values.push(...social_account_id);
          break;
        default:
          values.push(social_account_id);
          break;
      }

      query.in(
        'social_post_provider_connections.social_provider_connections.id',
        values,
      );
    }

    if (external_id) {
      const values: string[] = [];

      switch (true) {
        case typeof external_id === 'string': {
          values.push(...(external_id as string).split(','));
          break;
        }
        case Array.isArray(external_id):
          values.push(...external_id);
          break;
        default:
          values.push(external_id);
          break;
      }

      query.in('external_id', values);
    }

    if (status) {
      const values: string[] = [];

      switch (true) {
        case typeof status === 'string': {
          values.push(...(status as string).split(','));
          break;
        }
        case Array.isArray(status):
          values.push(...status);
          break;
        default:
          values.push(status);
          break;
      }

      query.in(
        'status',
        values.map((v) => v as PostStatusEnum),
      );
    }

    query.order('created_at', { ascending: false });

    const { data: posts, error, count } = await query;

    if (error) {
      throw error;
    }

    const transformedData: SocialPostDto[] = posts.map((data) => {
      const postData: SocialPostDto = this.transformPostData(data);

      return postData;
    });

    return {
      data: transformedData,
      count: count || 0,
    };
  }

  async updatePost({
    post,
    postId,
    projectId,
    apiKey,
    teamId,
    isSystem,
  }: {
    post: CreateSocialPostDto;
    postId: string;
    projectId: string;
    apiKey: string;
    teamId: string;
    isSystem: boolean;
  }): Promise<SocialPostDto | null> {
    try {
      await this.supabaseService.supabaseClient
        .from('social_post_provider_connections')
        .delete()
        .eq('post_id', postId);
    } catch (e) {
      this.logger.warnWithMeta('failed to delete post provider connections', {
        postId,
        projectId,
        error: e,
      });
    }

    try {
      await this.supabaseService.supabaseClient
        .from('social_post_media')
        .delete()
        .eq('post_id', postId);
    } catch (e) {
      this.logger.warnWithMeta('failed to delete post media', {
        postId,
        projectId,
        error: e,
      });
    }

    try {
      await this.supabaseService.supabaseClient
        .from('social_post_configurations')
        .delete()
        .eq('post_id', postId);
    } catch (e) {
      this.logger.warnWithMeta(
        'failed to delete post provider configurations',
        {
          postId,
          projectId,
          error: e,
        },
      );
    }
    try {
      await this.supabaseService.supabaseClient
        .from('social_posts')
        .delete()
        .eq('id', postId)
        .eq('project_id', projectId);
    } catch (e) {
      this.logger.warnWithMeta('failed to delete post before recreation', {
        postId,
        projectId,
        error: e,
      });
    }

    return this.createPost({
      postId,
      post,
      projectId,
      apiKey,
      teamId,
      isSystem,
    });
  }

  async deletePost({
    postId,
    projectId,
  }: {
    postId: string;
    projectId: string;
  }): Promise<DeleteEntityResponseDto> {
    try {
      const { error } = await this.supabaseService.supabaseClient
        .from('social_posts')
        .delete()
        .eq('project_id', projectId)
        .eq('id', postId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (err) {
      this.logger.errorWithMeta('deletePost failed', err, {
        postId,
        projectId,
      });
      return { success: false };
    }
  }

  private async triggerPost(postId: string): Promise<void> {
    try {
      const { data: post } = await this.supabaseService.supabaseClient
        .from('social_posts')
        .select(
          `
            id,
            project_id,
            caption,
            post_at,
            api_key,
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
          tags,
          skip_processing
        ),
            social_post_configurations (
              caption,
              provider,
              provider_connection_id,
              provider_data
            )
        `,
        )
        .eq('id', postId)
        .single();

      await tasks.trigger('process-post', { index: 0, post });
    } catch (error) {
      this.logger.errorWithMeta('triggerPost failed', error, {
        postId,
      });
      throw new Error('Something went wrong with processing the post.');
    }
  }

  private transformPostData(data: {
    caption: string;
    created_at: string;
    external_id: string | null;
    id: string;
    post_at: string;
    project_id: string;
    status: Database['public']['Enums']['social_post_status'];
    updated_at: string;
    social_post_provider_connections: {
      social_provider_connections: {
        provider: Provider;
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
    social_post_media: Array<{
      url: string;
      thumbnail_url: string | null;
      thumbnail_timestamp_ms: number | null;

      provider: Provider | null;
      provider_connection_id: string | null;
      tags: Json;
      skip_processing: boolean | null;
    }>;
    social_post_configurations: Array<{
      caption: string | null;

      provider: Provider | null;
      provider_connection_id: string | null;
      provider_data: Json;
    }>;
  }): SocialPostDto {
    const postMedia = data.social_post_media
      .filter((media) => !media.provider && !media.provider_connection_id)
      .map((media) => ({
        url: media.url,
        thumbnail_url: media.thumbnail_url,
        thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
        tags: media.tags as any[],
        skip_processing: media.skip_processing,
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
                skip_processing: media.skip_processing,
              })),
            ...configData,
          },
        };
      });

    const platformConfigurations: PlatformConfigurationsDto = {};

    data.social_post_configurations
      .filter((config) => config.provider)
      .map((config) => {
        platformConfigurations[
          config.provider! as
            | 'facebook'
            | 'instagram'
            | 'x'
            | 'tiktok'
            | 'youtube'
            | 'pinterest'
            | 'linkedin'
            | 'bluesky'
            | 'threads'
            | 'tiktok_business'
        ] = {
          caption: config.caption,
          media: data.social_post_media
            .filter((media) => media.provider_connection_id)
            .map((media) => ({
              url: media.url,
              thumbnail_url: media.thumbnail_url,
              thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
              tags: media.tags as any[],
              skip_processing: media.skip_processing,
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
        access_token: connection.social_provider_connections.access_token || '',
        refresh_token: connection.social_provider_connections.refresh_token,
        access_token_expires_at:
          connection.social_provider_connections.access_token_expires_at ||
          new Date().toISOString(),
        refresh_token_expires_at:
          connection.social_provider_connections.refresh_token_expires_at,
        external_id: connection.social_provider_connections.external_id,
      }),
    );

    const postData: SocialPostDto = {
      id: data.id,
      external_id: data.external_id,
      caption: data.caption,
      status: data.status as PostStatus,
      media: postMedia,
      platform_configurations: platformConfigurations,
      account_configurations: accountConfigurations,
      social_accounts: socialAccounts,
      scheduled_at: data.post_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return postData;
  }
}
