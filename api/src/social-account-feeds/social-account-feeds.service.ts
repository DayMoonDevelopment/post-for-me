import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import { PlatformPostQueryDto } from './dto/platform-post-query.dto';
import { PaginatedPlatformPostResponse } from './dto/pagination-platform-post-response.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { SocialProvierAppCredentials } from '../lib/dto/global.dto.ts';
import { SocialProviderService } from '../lib/social-provider-service.ts';

@Injectable()
export class SocialAccountFeedsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(REQUEST) private request: Request,
  ) {}

  generateNextUrl(queryParams: PlatformPostQueryDto): string {
    const url = new URL(
      `${this.request.protocol}://${this.request.get('host')}${this.request.path}`,
    );

    if (queryParams.cursor) {
      url.searchParams.set('cursor', queryParams.cursor);
    }

    url.searchParams.set('limit', String(queryParams.limit));

    return url.toString();
  }

  async getPlatformPosts({
    accountId,
    queryParams,
    projectId,
  }: {
    accountId: string;
    queryParams: PlatformPostQueryDto;
    projectId: string;
  }): Promise<PaginatedPlatformPostResponse> {
    //Get Account

    const { data: account, error: accountError } =
      await this.supabaseService.supabaseClient
        .from('social_provider_connections')
        .select()
        .eq('id', accountId)
        .eq('project_id', projectId)
        .single();

    if (accountError || !account) {
      console.error(accountError);
      throw new Error('Unable to fetch account');
    }

    const plaformPostIds: string[] = [];
    const postResultsQuery = this.supabaseService.supabaseClient
      .from('social_post_results')
      .select(
        `
            *,
            social_posts!inner(external_id)
                    
          `,
      )
      .eq('provider_connection_id', accountId);

    if (queryParams.social_post_id) {
      const values: string[] = [];
      switch (true) {
        case typeof queryParams.social_post_id === 'string': {
          values.push(...(queryParams.social_post_id as string).split(','));
          break;
        }
        case Array.isArray(queryParams.social_post_id):
          values.push(...queryParams.social_post_id);
          break;
        default:
          values.push(queryParams.social_post_id);
          break;
      }

      postResultsQuery.in('social_post_id', values);
    }

    if (queryParams.external_post_id) {
      const values: string[] = [];
      switch (true) {
        case typeof queryParams.external_post_id === 'string': {
          values.push(...(queryParams.external_post_id as string).split(','));
          break;
        }
        case Array.isArray(queryParams.external_post_id):
          values.push(...queryParams.external_post_id);
          break;
        default:
          values.push(queryParams.external_post_id);
          break;
      }

      postResultsQuery.in('social_posts.external_post_id', values);
    }

    if (queryParams.social_post_id || queryParams.external_post_id) {
      const { data: postResults } = await postResultsQuery;

      if (postResults && postResults.length > 0) {
        const ids = postResults
          ?.filter((pr) => pr.provider_post_id)
          ?.map((pr) => pr.provider_post_id!);
        plaformPostIds.push(...ids);
      }
    }

    if (queryParams.platform_post_id) {
      const values: string[] = [];
      switch (true) {
        case typeof queryParams.platform_post_id === 'string': {
          values.push(...(queryParams.platform_post_id as string).split(','));
          break;
        }
        case Array.isArray(queryParams.platform_post_id):
          values.push(...queryParams.platform_post_id);
          break;
        default:
          values.push(queryParams.platform_post_id);
          break;
      }

      plaformPostIds.push(...values);
    }

    //Get App Credentials
    const { data: appCredentials, error: appCredentialsError } =
      this.supabaseService.supabaseClient
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', account.provider)
        .single();

    if (appCredentialsError) {
      console.error(appCredentialsError);
      throw new Error('No app credentials found for platform');
    }
    // Use service to get post data based on query params

    await Promise.resolve();
    return {
      data: [],
      meta: {
        cursor: '',
        limit: queryParams.limit,
        next: this.generateNextUrl(queryParams),
      },
    };
  }

  getPlatformService({
    platform,
    appCredentials,
  }: {
    platform: string;
    appCredientials: SocialProvierAppCredentials;
  }): SocialProviderService {
    switch (platform) {
      case 'tiktok_business':
        break;
    }
  }
}
