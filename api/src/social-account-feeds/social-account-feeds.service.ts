import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import { PlatformPostQueryDto } from './dto/platform-post-query.dto';
import { PaginatedPlatformPostResponse } from './dto/pagination-platform-post-response.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { SocialAccount } from '../lib/dto/global.dto';
import { SocialPlatformService } from '../lib/social-provider-service';
import { TikTokBusinessService } from '../tiktok-business/tiktok-business.service';
import { YouTubeService } from '../youtube/youtube.service';
import { TikTokService } from '../tiktok/tiktok.service';
import { InstagramService } from '../instagram/instagram.service';
import { FacebookService } from '../facebook/facebook.service';
import { LinkedInService } from '../linkedin/linkedin.service';
import { PinterestService } from '../pinterest/pinterest.service';
import { ThreadsService } from '../threads/threads.service';
import { TwitterService } from '../twitter/twitter.service';
import { BlueskyService } from '../bluesky/bluesky.service';
import { differenceInDays } from 'date-fns';
import { PlatformPostDto } from './dto/platform-post.dto';

@Injectable()
export class SocialAccountFeedsService {
  platformsToAlwaysRefresh = ['youtube', 'bluesky'];
  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(REQUEST) private request: Request,
    private readonly tiktokBusinessService: TikTokBusinessService,
    private readonly youtubeService: YouTubeService,
    private readonly tiktokService: TikTokService,
    private readonly instagramService: InstagramService,
    private readonly facebookService: FacebookService,
    private readonly linkedinService: LinkedInService,
    private readonly pinterestService: PinterestService,
    private readonly threadsService: ThreadsService,
    private readonly twitterService: TwitterService,
    private readonly blueskyService: BlueskyService,
  ) {}

  generateNextUrl(
    queryParams: PlatformPostQueryDto,
    hasMore: boolean,
    cursor?: string,
  ): string | null {
    if (!hasMore) {
      return null;
    }

    const url = new URL(
      `${this.request.protocol}://${this.request.get('host')}${this.request.path}`,
    );

    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    url.searchParams.set('limit', String(queryParams.limit));

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

      url.searchParams.set('social_post_id', values.join(','));
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
      url.searchParams.set('external_post_id', values.join(','));
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

      url.searchParams.set('platform_post_id', values.join(','));
    }

    if (queryParams.expand) {
      const values: string[] = [];
      switch (true) {
        case typeof queryParams.expand === 'string': {
          values.push(...(queryParams.expand as string).split(','));
          break;
        }
        case Array.isArray(queryParams.expand):
          values.push(...queryParams.expand);
          break;
        default:
          values.push(queryParams.expand);
          break;
      }

      url.searchParams.set('expand', values.join(','));
    }
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

      postResultsQuery.in('post_id', values);
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

    let platformName = account.provider;

    if (
      platformName == 'instagram' &&
      !account.access_token?.startsWith('IG')
    ) {
      platformName = 'instagram_w_facebook';
    }

    const platformService = await this.getPlatformService({
      platform: platformName,
      projectId,
    });

    const socialAccount: SocialAccount = {
      provider: account.provider,
      id: account.id,
      social_provider_user_name: account.social_provider_user_name,
      access_token: account.access_token || '',
      refresh_token: account.refresh_token,
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
      this.platformsToAlwaysRefresh.includes(account.provider) ||
      differenceInDays(
        new Date(account.access_token_expires_at || new Date()),
        new Date(),
      ) <= 7
    ) {
      console.log('refreshing token');
      const updatedAccount =
        await platformService.refreshAccessToken(socialAccount);
      console.log(updatedAccount);

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

    // Determine if metrics should be included
    let includeMetrics = false;

    if (queryParams.expand) {
      const values: string[] = [];
      switch (true) {
        case typeof queryParams.expand === 'string': {
          values.push(...(queryParams.expand as string).split(','));
          break;
        }
        case Array.isArray(queryParams.expand):
          values.push(...queryParams.expand);
          break;
        default:
          values.push(queryParams.expand);
          break;
      }

      includeMetrics = values.includes('metrics');
    }

    // Fetch account posts and social post results in parallel
    const accountPostsResult = await platformService.getAccountPosts({
      account: socialAccount,
      platformIds: platformPostIds,
      limit: queryParams.limit,
      cursor: queryParams.cursor,
      includeMetrics,
    });

    const uniqueAccountIds = new Set(accountPostsResult.posts.map((p) => p.id));

    const socialPostResultsResponse = await this.supabaseService.supabaseClient
      .from('social_post_results')
      .select(
        `
          *,
          social_posts!inner(*)
        `,
      )
      .eq('provider_connection_id', accountId)
      .in('provider_post_id', [...uniqueAccountIds]);

    const { data: socialPostResults } = socialPostResultsResponse;

    // Create a map of provider_post_id to social post result with post data
    const postResultMap = new Map(
      socialPostResults?.map((result) => [
        result.provider_post_id,
        {
          social_post_result_id: result.id,
          social_post_id: result.post_id,
          external_post_id: result.social_posts?.external_id,
        },
      ]) || [],
    );

    const result: PaginatedPlatformPostResponse = {
      data: accountPostsResult.posts.map((p): PlatformPostDto => {
        const matchedResult = postResultMap.get(p.id);
        return {
          external_account_id: account.external_id || undefined,
          platform_account_id: p.account_id,
          platform_post_id: p.id,
          media: p.media,
          caption: p.caption,
          ...(includeMetrics && p.metrics ? { metrics: p.metrics } : {}),
          platform: p.provider!.toString(),
          social_account_id: socialAccount.id,
          platform_url: p.url,
          social_post_result_id: matchedResult?.social_post_result_id,
          social_post_id: matchedResult?.social_post_id,
          external_post_id: matchedResult?.external_post_id || undefined,
          posted_at: p.posted_at || undefined,
        };
      }),
      meta: {
        cursor: accountPostsResult.cursor || '',
        limit: queryParams.limit,
        next: this.generateNextUrl(
          queryParams,
          accountPostsResult.has_more,
          accountPostsResult.cursor,
        ),
        has_more: accountPostsResult.has_more,
      },
    };

    return result;
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
      case 'youtube':
        await this.youtubeService.initService(projectId);
        return this.youtubeService;
      case 'tiktok':
        await this.tiktokService.initService(projectId);
        return this.tiktokService;
      case 'instagram':
        await this.instagramService.initService(projectId);
        return this.instagramService;
      case 'instagram_w_facebook':
        await this.instagramService.initFacebookService(projectId);
        return this.instagramService;
      case 'facebook':
        await this.facebookService.initService(projectId);
        return this.facebookService;
      case 'linkedin':
        await this.linkedinService.initService(projectId);
        return this.linkedinService;
      case 'pinterest':
        await this.pinterestService.initService(projectId);
        return this.pinterestService;
      case 'threads':
        await this.threadsService.initService(projectId);
        return this.threadsService;
      case 'x':
        await this.twitterService.initService(projectId);
        return this.twitterService;
      case 'bluesky':
        await this.blueskyService.initService(projectId);
        return this.blueskyService;
    }
    throw new Error('Unable to create platform service');
  }
}
