import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { TwitterApi } from 'twitter-api-v2';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ scope: Scope.REQUEST })
export class TwitterService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'x')
        .single();

    if (!appCredentials || appCredentialsError) {
      console.error(appCredentialsError);
      throw new Error('No app credentials found for platform');
    }

    this.appCredentials = {
      appId: appCredentials.app_id || '',
      appSecret: appCredentials.app_secret || '',
      provider: appCredentials.provider,
      projectId: appCredentials.project_id,
    };
  }

  async refreshAccessToken(account: SocialAccount): Promise<SocialAccount> {
    // Twitter OAuth 1.0a tokens don't expire
    await Promise.resolve();
    return account;
  }

  async getAccountPosts({
    account,
    platformIds,
    limit,
    cursor,
    includeMetrics = false,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    platformPostsMetadata?: any;
    limit: number;
    cursor?: string;
    includeMetrics?: boolean;
  }): Promise<PlatformPostsResponse> {
    try {
      const twitterClient = new TwitterApi({
        appKey: this.appCredentials.appId,
        appSecret: this.appCredentials.appSecret,
        accessToken: account.access_token,
        accessSecret: account.refresh_token || '',
      });

      const safeLimit = Math.min(limit, 100);

      if (platformIds && platformIds.length > 0) {
        // Fetch specific tweets by ID
        // Only request public_metrics if includeMetrics is true
        const tweets = await twitterClient.v2.tweets(platformIds, {
          'tweet.fields': includeMetrics
            ? ['created_at', 'public_metrics', 'attachments', 'entities']
            : ['created_at', 'attachments', 'entities'],
          expansions: ['attachments.media_keys'],
          'media.fields': ['url', 'preview_image_url'],
        });

        const posts: PlatformPost[] = (tweets.data || []).map((tweet) => ({
          provider: 'x',
          id: tweet.id,
          account_id: account.social_provider_user_id,
          caption: tweet.text,
          url: `https://twitter.com/user/status/${tweet.id}`,
          media: [],
          metrics: includeMetrics
            ? {
                likes: tweet.public_metrics?.like_count || 0,
                comments: tweet.public_metrics?.reply_count || 0,
                shares: tweet.public_metrics?.retweet_count || 0,
                favorites: 0,
                reach: tweet.public_metrics?.impression_count || 0,
                video_views: 0,
                total_time_watched: 0,
                average_time_watched: 0,
                full_video_watched_rate: 0,
                new_followers: 0,
                profile_views: 0,
                website_clicks: 0,
                phone_number_clicks: 0,
                lead_submissions: 0,
                app_download_clicks: 0,
                email_clicks: 0,
                address_clicks: 0,
                video_view_retention: [],
                impression_sources: [],
                audience_types: [],
                audience_genders: [],
                audience_countries: [],
                audience_cities: [],
                engagement_likes: [],
              }
            : undefined,
        }));

        return {
          posts,
          count: posts.length,
          has_more: false,
        };
      }

      // Fetch user's timeline
      const tweets = await twitterClient.v2.userTimeline(
        account.social_provider_user_id,
        {
          max_results: safeLimit,
          'tweet.fields': includeMetrics
            ? ['created_at', 'public_metrics', 'attachments', 'entities']
            : ['created_at', 'attachments', 'entities'],
          expansions: ['attachments.media_keys'],
          'media.fields': ['url', 'preview_image_url'],
          pagination_token: cursor,
        },
      );

      const posts: PlatformPost[] = tweets.data.data.map((tweet) => ({
        provider: 'x',
        id: tweet.id,
        account_id: account.social_provider_user_id,
        caption: tweet.text,
        url: `https://twitter.com/user/status/${tweet.id}`,
        media: [],
        metrics: includeMetrics
          ? {
              likes: tweet.public_metrics?.like_count || 0,
              comments: tweet.public_metrics?.reply_count || 0,
              shares: tweet.public_metrics?.retweet_count || 0,
              favorites: 0,
              reach: tweet.public_metrics?.impression_count || 0,
              video_views: 0,
              total_time_watched: 0,
              average_time_watched: 0,
              full_video_watched_rate: 0,
              new_followers: 0,
              profile_views: 0,
              website_clicks: 0,
              phone_number_clicks: 0,
              lead_submissions: 0,
              app_download_clicks: 0,
              email_clicks: 0,
              address_clicks: 0,
              video_view_retention: [],
              impression_sources: [],
              audience_types: [],
              audience_genders: [],
              audience_countries: [],
              audience_cities: [],
              engagement_likes: [],
            }
          : undefined,
      }));

      return {
        posts,
        count: posts.length,
        has_more: !!tweets.meta.next_token,
        cursor: tweets.meta.next_token,
      };
    } catch (error) {
      console.error('Error fetching Twitter/X posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
