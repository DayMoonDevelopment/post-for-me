import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import { SocialPostResultDto } from './dto/post-results.dto';
import { SocialPostResultQueryDto } from './dto/post-results.query.dto';

import type { PaginatedRequestQuery } from '../pagination/pagination-request.interface';

import { Database } from '@post-for-me/db';

type ProviderEnum = Database['public']['Enums']['social_provider'];

@Injectable()
export class PostResultsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getPostResultRecord(
    id: string,
    projectId: string,
  ): Promise<{
    data: {
      success: boolean;
      provider_post_id?: string;
      provider_post_url?: string;
      id: string;
      details?: any;
      post_id: string;
      provider_connection_id: string;
      error_message?: string;
      media?: SocialPostResultDto['media'];
    };
  }> {
    const { data: postResult, error: postResultError } =
      await this.supabaseService.supabaseClient
        .from('social_post_results')
        .select(
          '*, social_provider_connections(provider, project_id), social_post_result_post_media(social_post_media(url, thumbnail_url, thumbnail_timestamp_ms, tags, skip_processing))',
        )
        .eq('id', id)
        .eq('social_provider_connections.project_id', projectId)
        .maybeSingle();

    if (!postResult || postResultError) {
      throw new Error(postResultError?.message);
    }

    return {
      data: {
        success: postResult.success,
        provider_post_id: postResult?.provider_post_id || undefined,
        provider_post_url: postResult?.provider_post_url || undefined,
        id: postResult?.id,
        details: postResult?.details,
        post_id: postResult?.post_id,
        provider_connection_id: postResult?.provider_connection_id,
        error_message: postResult?.error_message || undefined,
        media:
          postResult?.social_post_result_post_media?.map((resultMedia) => ({
            url: resultMedia.social_post_media.url,
            thumbnail_url: resultMedia.social_post_media.thumbnail_url,
            thumbnail_timestamp_ms:
              resultMedia.social_post_media.thumbnail_timestamp_ms,
            tags: resultMedia.social_post_media.tags as any[] | null,
            skip_processing: resultMedia.social_post_media.skip_processing,
          })) || [],
      },
    };
  }

  async getPostResults(
    queryParams: SocialPostResultQueryDto,
    projectId: string,
  ): PaginatedRequestQuery<SocialPostResultDto> {
    const { offset, limit, post_id, platform, social_account_id } = queryParams;

    const query = this.supabaseService.supabaseClient
      .from('social_post_results')
      .select(
        '*, social_provider_connections!inner(provider, project_id), social_post_result_post_media(social_post_media(url, thumbnail_url, thumbnail_timestamp_ms, tags, skip_processing))',
        {
          count: 'exact',
          head: false,
        },
      )
      .eq('social_provider_connections.project_id', projectId)
      .range(offset, offset + limit - 1);

    if (post_id) {
      const values: string[] = [];

      switch (true) {
        case typeof post_id === 'string': {
          values.push(...(post_id as string).split(','));
          break;
        }
        case Array.isArray(post_id):
          values.push(...post_id);
          break;
        default:
          values.push(post_id);
          break;
      }

      query.in('post_id', values);
    }

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
        'social_provider_connections.provider',
        values.map((provider) => provider as ProviderEnum),
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

      query.in('provider_connection_id', values);
    }

    query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const transformedData: SocialPostResultDto[] = data.map((raw) => {
      let platform_data = null;

      if (raw.success) {
        platform_data = {
          id: raw.provider_post_id,
          url: raw.provider_post_url,
        };
      }

      return {
        id: raw.id,
        social_account_id: raw.provider_connection_id,
        post_id: raw.post_id,
        success: raw.success,
        error: raw.error_message,
        details: raw.details,
        platform_data,
        media:
          raw.social_post_result_post_media?.map((resultMedia) => ({
            url: resultMedia.social_post_media.url,
            thumbnail_url: resultMedia.social_post_media.thumbnail_url,
            thumbnail_timestamp_ms:
              resultMedia.social_post_media.thumbnail_timestamp_ms,
            tags: resultMedia.social_post_media.tags as any[] | null,
            skip_processing: resultMedia.social_post_media.skip_processing,
          })) || [],
      };
    });

    return {
      data: transformedData,
      count: count || 0,
    };
  }

  async getPostResultById(
    id: string,
    projectId: string,
  ): Promise<SocialPostResultDto | null> {
    const postResults = await this.getPostResultRecord(id, projectId);

    if (!postResults.data) {
      return null;
    }

    let platform_data = null;

    if (postResults.data.success) {
      platform_data = {
        id: postResults.data.provider_post_id || null,
        url: postResults.data.provider_post_url || null,
      };
    }

    const result: SocialPostResultDto = {
      id: postResults.data.id,
      social_account_id: postResults.data.provider_connection_id,
      post_id: postResults.data.post_id,
      success: postResults.data.success,
      error: postResults.data.error_message || null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      details: postResults.data.details,
      platform_data,
      media: postResults.data.media || [],
    };

    return result;
  }
}
