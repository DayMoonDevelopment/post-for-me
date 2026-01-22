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
            ? [
                'created_at',
                'public_metrics',
                'organic_metrics',
                'non_public_metrics',
                'attachments',
                'entities',
              ]
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
                public_metrics: tweet.public_metrics
                  ? {
                      retweet_count: tweet.public_metrics.retweet_count || 0,
                      reply_count: tweet.public_metrics.reply_count || 0,
                      like_count: tweet.public_metrics.like_count || 0,
                      quote_count: tweet.public_metrics.quote_count || 0,
                      impression_count:
                        tweet.public_metrics.impression_count || 0,
                      bookmark_count: tweet.public_metrics.bookmark_count || 0,
                    }
                  : undefined,
                organic_metrics: tweet.organic_metrics
                  ? {
                      impression_count:
                        tweet.organic_metrics.impression_count || 0,
                      like_count: tweet.organic_metrics.like_count || 0,
                      reply_count: tweet.organic_metrics.reply_count || 0,
                      retweet_count: tweet.organic_metrics.retweet_count || 0,
                      url_link_clicks:
                        tweet.organic_metrics.url_link_clicks || 0,
                      user_profile_clicks:
                        tweet.organic_metrics.user_profile_clicks || 0,
                    }
                  : undefined,
                non_public_metrics: tweet.non_public_metrics
                  ? {
                      impression_count:
                        tweet.non_public_metrics.impression_count || 0,
                      url_link_clicks:
                        tweet.non_public_metrics.url_link_clicks || 0,
                      user_profile_clicks:
                        tweet.non_public_metrics.user_profile_clicks || 0,
                    }
                  : undefined,
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
            ? [
                'created_at',
                'public_metrics',
                'organic_metrics',
                'non_public_metrics',
                'attachments',
                'entities',
              ]
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
              public_metrics: tweet.public_metrics
                ? {
                    retweet_count: tweet.public_metrics.retweet_count || 0,
                    reply_count: tweet.public_metrics.reply_count || 0,
                    like_count: tweet.public_metrics.like_count || 0,
                    quote_count: tweet.public_metrics.quote_count || 0,
                    impression_count:
                      tweet.public_metrics.impression_count || 0,
                    bookmark_count: tweet.public_metrics.bookmark_count || 0,
                  }
                : undefined,
              organic_metrics: tweet.organic_metrics
                ? {
                    impression_count:
                      tweet.organic_metrics.impression_count || 0,
                    like_count: tweet.organic_metrics.like_count || 0,
                    reply_count: tweet.organic_metrics.reply_count || 0,
                    retweet_count: tweet.organic_metrics.retweet_count || 0,
                    url_link_clicks: tweet.organic_metrics.url_link_clicks || 0,
                    user_profile_clicks:
                      tweet.organic_metrics.user_profile_clicks || 0,
                  }
                : undefined,
              non_public_metrics: tweet.non_public_metrics
                ? {
                    impression_count:
                      tweet.non_public_metrics.impression_count || 0,
                    url_link_clicks:
                      tweet.non_public_metrics.url_link_clicks || 0,
                    user_profile_clicks:
                      tweet.non_public_metrics.user_profile_clicks || 0,
                  }
                : undefined,
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
