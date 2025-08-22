import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { differenceInMinutes } from 'date-fns';
import { SocialPostDto, PostStatus } from './dto/post.dto';
import type { CreateSocialPostDto } from './dto/create-post.dto';
import { SocialPostQueryDto } from './dto/post-query.dto';

import type { PaginatedRequestQuery } from '../pagination/pagination-request.interface';
import { DeleteEntityResponseDto } from '../lib/global.dto';
import { tasks } from '@trigger.dev/sdk/v3';
import type { Provider } from '../lib/global.dto';
import {
  PlatformConfiguration,
  PlatformConfigurationsDto,
} from './dto/post-configurations.dto';
import { Database, Json } from '@post-for-me/db';
import { PostValidation } from './dto/post-validation.dto';
import { SocialPostMetersService } from 'src/social-post-meters/social-post-meters.service';

@Injectable()
export class SocialPostsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly socialPostMetersService: SocialPostMetersService,
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
      differenceInMinutes(post.scheduled_at, new Date()) < 5
    ) {
      errors.push('scheduled_at must be at least 5 mins from now');
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
    }[] = [];

    const postConfigurations: {
      caption?: string | undefined | null;
      provider?: Provider | undefined | null;
      provider_connection_id?: string | undefined | null;
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
            }[];
          },
        ]) => {
          if (config.media) {
            postMedia.push(
              ...(config.media.map((media) => ({
                url: media.url,
                thumbnail_url: media.thumbnail_url,
                thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
                post_id: data.id,
                provider: provider as Provider,
              })) as Array<{
                url: string;
                thumbnail_url?: string;
                thumbnail_timestamp_ms?: number;
                post_id: string;
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

    if (post.account_configurations) {
      for (const accountConfig of post.account_configurations) {
        if (accountConfig.configuration?.media) {
          postMedia.push(
            ...accountConfig.configuration.media.map((media) => ({
              url: media.url,
              thumbnail_url: media.thumbnail_url,
              thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
              post_id: data.id,
              provider_connection_id: accountConfig.social_account_id,
            })),
          );
        }

        const platformConfig = accountConfig.configuration;
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
      console.error(insertPostMediaError);
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
      console.error(insertPostConfigurationsError);
    }

    if (!post.scheduled_at) {
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
          provider_connection_id
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
    const { offset, limit, platform, status, external_id } = queryParams;

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
          provider_connection_id
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
      if (typeof platform === 'string') {
        query.eq(
          'social_post_provider_connections.social_provider_connections.provider',
          platform as
            | 'facebook'
            | 'instagram'
            | 'x'
            | 'tiktok'
            | 'youtube'
            | 'pinterest'
            | 'linkedin'
            | 'bluesky'
            | 'threads',
        );
      } else if (Array.isArray(platform)) {
        query.in(
          'social_post_provider_connections.social_provider_connections.provider',
          platform as (
            | 'facebook'
            | 'instagram'
            | 'x'
            | 'tiktok'
            | 'youtube'
            | 'pinterest'
            | 'linkedin'
            | 'bluesky'
            | 'threads'
          )[],
        );
      }
    }

    if (external_id) {
      if (typeof external_id === 'string') {
        query.eq('external_id', external_id);
      } else if (Array.isArray(external_id)) {
        query.in('external_id', external_id);
      }
    }

    if (status) {
      if (typeof status === 'string') {
        query.eq('status', status);
      } else if (Array.isArray(status)) {
        query.in('status', status);
      }
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
      console.log(`Error deleting post provider connections: ${e}`);
    }

    try {
      await this.supabaseService.supabaseClient
        .from('social_post_media')
        .delete()
        .eq('post_id', postId);
    } catch (e) {
      console.log(`Error deleting post media: ${e}`);
    }

    try {
      await this.supabaseService.supabaseClient
        .from('social_post_configurations')
        .delete()
        .eq('post_id', postId);
    } catch (e) {
      console.log(`Error deleting post provider configurations: ${e}`);
    }
    try {
      await this.supabaseService.supabaseClient
        .from('social_posts')
        .delete()
        .eq('id', postId)
        .eq('project_id', projectId);
    } catch (e) {
      console.log(`Error deleting post: ${e}`);
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
    const { error } = await this.supabaseService.supabaseClient
      .from('social_posts')
      .delete()
      .eq('project_id', projectId)
      .eq('id', postId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
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
              provider_connection_id
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
      console.log(error);
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
    social_post_media: {
      url: string;
      thumbnail_url: string | null;
      thumbnail_timestamp_ms: number | null;
      provider: Provider | null;
      provider_connection_id: string | null;
    }[];
    social_post_configurations: {
      caption: string | null;
      provider: Provider | null;
      provider_connection_id: string | null;
      provider_data: Json;
    }[];
  }): SocialPostDto {
    const postMedia = data.social_post_media
      .filter((media) => !media.provider && !media.provider_connection_id)
      .map((media) => ({
        url: media.url,
        thumbnail_url: media.thumbnail_url,
        thumbnail_timestamp_ms: media.thumbnail_timestamp_ms,
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
              })),
            ...configData,
          },
        };
      });

    const platformConfigurations: PlatformConfigurationsDto = {};

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
