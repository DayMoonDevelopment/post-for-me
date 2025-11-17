import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import { PlatformPostQueryDto } from './dto/platform-post-query.dto';
import { PaginatedPlatformPostResponse } from './dto/pagination-platform-post-response.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { SocialAccount } from '../lib/dto/global.dto';
import { SocialPlatformService } from '../lib/social-provider-service';
import { TikTokBusinessService } from '../tiktok-business/tiktok-business.service';
import { differenceInDays } from 'date-fns';

@Injectable()
export class SocialAccountFeedsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(REQUEST) private request: Request,
    private readonly tiktokBusinessService: TikTokBusinessService,
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

    const platformPostIds: string[] = [];
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
        platformPostIds.push(...ids);
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

      platformPostIds.push(...values);
    }

    //Get App Credentials
    const platformService = await this.getPlatformService({
      platform: account.provider,
      projectId,
    });

    const socialAccount: SocialAccount = {
      provider: account.provider,
      id: account.id,
      social_provider_user_name: account.social_provider_user_name,
      access_token: account.access_token || '',
      refresh_token: account.access_token,
      access_token_expires_at: new Date(
        account.access_token_expires_at || new Date(),
      ),
      refresh_token_expires_at: account.refresh_token_expires_at
        ? new Date(account.refresh_token_expires_at)
        : null,
      social_provider_user_id: account.social_provider_user_id,
      social_provider_metadata: account.social_provider_metadata,
    };

    if (
      differenceInDays(
        new Date(account.access_token_expires_at || new Date()),
        new Date(),
      ) >= 7
    ) {
      const updatedAccount =
        await platformService.refreshAccessToken(socialAccount);

      if (updatedAccount) {
        await this.supabaseService.supabaseClient
          .from('social_provider_connections')
          .update({
            access_token: updatedAccount.access_token,
            refresh_token: updatedAccount.refresh_token,
            access_token_expires_at:
              updatedAccount.access_token_expires_at?.toISOString(),
            refresh_token_expires_at:
              updatedAccount.refresh_token_expires_at?.toISOString(),
          })
          .eq('id', account.id);
      }
    }

    const posts = await platformService.getAccountPosts({
      account: socialAccount,
      platformIds: platformPostIds,
    });
    console.log(posts);

    //Get System posts that match platform posts
    return {
      data: [],
      meta: {
        cursor: '',
        limit: queryParams.limit,
        next: this.generateNextUrl(queryParams),
      },
    };
  }

  async getPlatformService({
    platform,
    projectId,
  }: {
    platform: string;
    projectId: string;
  }): Promise<SocialPlatformService> {
    switch (platform) {
      case 'tiktok_business':
        await this.tiktokBusinessService.initService(projectId);
        return this.tiktokBusinessService;
    }
    throw new Error('Unable to create platform service');
  }
}
