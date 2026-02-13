import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { TwitterApi, MediaVariantsV2, MediaObjectV2 } from 'twitter-api-v2';
import { SupabaseService } from '../supabase/supabase.service';

import { AppLogger } from '../logger/app-logger';

@Injectable({ scope: Scope.REQUEST })
export class TwitterService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  private readonly logger = new AppLogger(TwitterService.name);

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
      this.logger.errorWithMeta('missing x app credentials', undefined, {
        projectId,
        supabase_error: appCredentialsError,
      });
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
          'media.fields': ['url', 'preview_image_url', 'type', 'variants'],
        });

        const media = tweets.includes?.media || [];

        const posts: PlatformPost[] = (tweets.data || []).map((tweet) => ({
          provider: 'x',
          id: tweet.id,
          account_id: account.social_provider_user_id,
          caption: tweet.text,
          url: `https://twitter.com/user/status/${tweet.id}`,
          media: this.extractTweetMedia(tweet, media),
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
          'media.fields': ['url', 'preview_image_url', 'type', 'variants'],
          pagination_token: cursor,
        },
      );

      const media = tweets.data.includes?.media || [];

      const posts: PlatformPost[] = tweets.data.data.map((tweet) => ({
        provider: 'x',
        id: tweet.id,
        account_id: account.social_provider_user_id,
        caption: tweet.text,
        url: `https://twitter.com/user/status/${tweet.id}`,
        media: this.extractTweetMedia(tweet, media),
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
      this.logger.errorWithMeta('x posts fetch failed', error, {
        accountId: account.id,
        includeMetrics,
      });
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }

  pickBestVideoVariantUrl(
    variants: MediaVariantsV2[] | undefined,
  ): string | undefined {
    if (!variants || variants.length === 0) return undefined;

    const mp4Variants = variants.filter(
      (v) => typeof v.url === 'string' && v.content_type === 'video/mp4',
    );
    if (mp4Variants.length === 0) return undefined;

    return mp4Variants.sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0]
      ?.url;
  }

  extractTweetMedia(
    tweet: { attachments?: { media_keys?: string[] } },
    twitterMedia: MediaObjectV2[],
  ): { url: string; thumbnail_url?: string }[] {
    const mediaKeys = tweet.attachments?.media_keys ?? [];

    return mediaKeys
      .map((mediaKey) => {
        const media = twitterMedia.find((m) => m.media_key == mediaKey);
        if (!media) return null;

        const url =
          media.url ||
          this.pickBestVideoVariantUrl(media.variants) ||
          media.preview_image_url;
        if (!url) return null;

        const thumbnailUrl =
          media.preview_image_url && media.preview_image_url !== url
            ? media.preview_image_url
            : undefined;

        return thumbnailUrl ? { url, thumbnail_url: thumbnailUrl } : { url };
      })
      .filter((m): m is { url: string; thumbnail_url?: string } => m !== null);
  }
}
