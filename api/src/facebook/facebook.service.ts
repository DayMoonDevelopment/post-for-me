import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios, { AxiosError } from 'axios';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  FacebookTokenResponse,
  FacebookPost,
  FacebookFeedResponse,
  FacebookInsightsResponse,
} from './facebook.types';
import { FacebookPostMetricsDto } from './dto/facebook-post-metrics.dto';

@Injectable({ scope: Scope.REQUEST })
export class FacebookService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'facebook')
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
    try {
      const response = await axios.get(
        'https://graph.facebook.com/v20.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appCredentials.appId,
            client_secret: this.appCredentials.appSecret,
            fb_exchange_token: account.access_token,
          },
        },
      );

      const data = response.data as FacebookTokenResponse;
      if (!data.access_token) {
        throw new Error('No access token in refresh response');
      }

      account.access_token = data.access_token;
      account.access_token_expires_at = new Date(
        Date.now() + 60 * 24 * 60 * 60 * 1000,
      );

      return account;
    } catch (error) {
      console.error('Error refreshing Facebook token:', error);
      throw error;
    }
  }

  async getAccountPosts({
    account,
    platformIds,
    limit,
  }: {
    account: SocialAccount;
    platformIds?: string[];
    limit: number;
  }): Promise<PlatformPostsResponse> {
    try {
      const safeLimit = Math.min(limit, 25);

      if (platformIds && platformIds.length > 0) {
        // Fetch specific posts by ID
        const postPromises = platformIds.map((id) =>
          axios.get(`https://graph.facebook.com/v20.0/${id}`, {
            params: {
              fields:
                'id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares',
              access_token: account.access_token,
            },
          }),
        );

        const responses = await Promise.all(postPromises);
        const posts: PlatformPost[] = await Promise.all(
          responses.map(async (response) => {
            const post = response.data as FacebookPost;
            return this.mapFacebookPostToPlatformPost(post, account);
          }),
        );

        return {
          posts,
          count: posts.length,
          has_more: false,
        };
      }

      // Fetch posts from feed
      const response = await axios.get(
        `https://graph.facebook.com/v20.0/${account.social_provider_user_id}/feed`,
        {
          params: {
            fields:
              'id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares',
            access_token: account.access_token,
            limit: safeLimit,
          },
        },
      );

      const feedResponse = response.data as FacebookFeedResponse;
      const posts: PlatformPost[] = await Promise.all(
        (feedResponse.data || []).map((post) =>
          this.mapFacebookPostToPlatformPost(post, account),
        ),
      );

      return {
        posts,
        count: posts.length,
        has_more: !!feedResponse.paging?.next,
        cursor: feedResponse.paging?.cursors?.after,
      };
    } catch (error) {
      console.error('Error fetching Facebook posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }

  private async fetchPostInsights(
    postId: string,
    accessToken: string,
  ): Promise<FacebookPostMetricsDto> {
    try {
      const metrics: FacebookPostMetricsDto = {};

      // Fetch post insights with all requested metrics
      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v20.0/${postId}/insights`,
        {
          params: {
            metric: [
              'post_impressions_unique',
              'post_media_view',
              'post_reactions_like_total',
              'post_reactions_love_total',
              'post_reactions_wow_total',
              'post_reactions_haha_total',
              'post_reactions_sorry_total',
              'post_reactions_anger_total',
              'post_reactions_by_type_total',
              'post_impressions_viral_unique',
              'post_impressions_paid_unique',
              'post_impressions_fan_unique',
              'post_impressions_organic_unique',
              'post_impressions_nonviral_unique',
              'post_video_avg_time_watched',
              'post_video_complete_views_organic',
              'post_video_complete_views_organic_unique',
              'post_video_complete_views_paid',
              'post_video_complete_views_paid_unique',
              'post_video_retention_graph_clicked_to_play',
              'post_video_retention_graph_autoplayed',
              'post_video_views_organic',
              'post_video_views_organic_unique',
              'post_video_views_paid',
              'post_video_views_paid_unique',
              'post_video_length',
              'post_video_views',
              'post_video_views_unique',
              'post_video_views_autoplayed',
              'post_video_views_clicked_to_play',
              'post_video_views_15s',
              'post_video_views_60s_excludes_shorter',
              'post_video_views_sound_on',
              'post_video_view_time',
              'post_video_view_time_organic',
              'post_video_view_time_by_age_bucket_and_gender',
              'post_video_view_time_by_region_id',
              'post_video_views_by_distribution_type',
              'post_video_view_time_by_distribution_type',
              'post_video_view_time_by_country_id',
              'post_video_social_actions_count_unique',
              'post_activity_by_action_type',
              'post_activity_by_action_type_unique',
            ].join(','),
            access_token: accessToken,
          },
        },
      );

      const insightsData = insightsResponse.data as FacebookInsightsResponse;

      // Process insights data
      for (const insight of insightsData.data || []) {
        const value = insight.values?.[0]?.value;

        switch (insight.name) {
          // Reach and Impressions
          case 'post_impressions_unique':
            metrics.reach = typeof value === 'number' ? value : 0;
            break;
          case 'post_impressions_viral_unique':
            metrics.viral_reach = typeof value === 'number' ? value : 0;
            break;
          case 'post_impressions_paid_unique':
            metrics.paid_reach = typeof value === 'number' ? value : 0;
            break;
          case 'post_impressions_fan_unique':
            metrics.fan_reach = typeof value === 'number' ? value : 0;
            break;
          case 'post_impressions_organic_unique':
            metrics.organic_reach = typeof value === 'number' ? value : 0;
            break;
          case 'post_impressions_nonviral_unique':
            metrics.nonviral_reach = typeof value === 'number' ? value : 0;
            break;

          // Media Views
          case 'post_media_view':
            metrics.media_views = typeof value === 'number' ? value : 0;
            break;

          // Reactions
          case 'post_reactions_like_total':
            metrics.reactions_like = typeof value === 'number' ? value : 0;
            break;
          case 'post_reactions_love_total':
            metrics.reactions_love = typeof value === 'number' ? value : 0;
            break;
          case 'post_reactions_wow_total':
            metrics.reactions_wow = typeof value === 'number' ? value : 0;
            break;
          case 'post_reactions_haha_total':
            metrics.reactions_haha = typeof value === 'number' ? value : 0;
            break;
          case 'post_reactions_sorry_total':
            metrics.reactions_sorry = typeof value === 'number' ? value : 0;
            break;
          case 'post_reactions_anger_total':
            metrics.reactions_anger = typeof value === 'number' ? value : 0;
            break;
          case 'post_reactions_by_type_total':
            if (typeof value === 'object' && value !== null) {
              metrics.reactions_by_type = value;
              // Calculate total reactions
              metrics.reactions_total = Object.values(value).reduce(
                (sum, count) => sum + count,
                0,
              );
            }
            break;

          // Video Views
          case 'post_video_views':
            metrics.video_views = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_unique':
            metrics.video_views_unique = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_organic':
            metrics.video_views_organic = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_organic_unique':
            metrics.video_views_organic_unique =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_paid':
            metrics.video_views_paid = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_paid_unique':
            metrics.video_views_paid_unique =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_autoplayed':
            metrics.video_views_autoplayed =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_clicked_to_play':
            metrics.video_views_clicked_to_play =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_15s':
            metrics.video_views_15s = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_60s_excludes_shorter':
            metrics.video_views_60s = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_views_sound_on':
            metrics.video_views_sound_on =
              typeof value === 'number' ? value : 0;
            break;

          // Video Complete Views
          case 'post_video_complete_views_organic':
            metrics.video_complete_views_organic =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_complete_views_organic_unique':
            metrics.video_complete_views_organic_unique =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_complete_views_paid':
            metrics.video_complete_views_paid =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_complete_views_paid_unique':
            metrics.video_complete_views_paid_unique =
              typeof value === 'number' ? value : 0;
            break;

          // Video Watch Time
          case 'post_video_view_time':
            metrics.video_view_time = typeof value === 'number' ? value : 0;
            break;
          case 'post_video_view_time_organic':
            metrics.video_view_time_organic =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_avg_time_watched':
            metrics.video_avg_time_watched =
              typeof value === 'number' ? value : 0;
            break;
          case 'post_video_length':
            metrics.video_length = typeof value === 'number' ? value : 0;
            break;

          // Video Demographics
          case 'post_video_view_time_by_age_bucket_and_gender':
            if (typeof value === 'object' && value !== null) {
              metrics.video_view_time_by_age_gender = Object.entries(value).map(
                ([key, val]) => ({
                  key,
                  value: Number(val),
                }),
              );
            }
            break;
          case 'post_video_view_time_by_region_id':
            if (typeof value === 'object' && value !== null) {
              metrics.video_view_time_by_region = Object.entries(value).map(
                ([key, val]) => ({
                  key,
                  value: Number(val),
                }),
              );
            }
            break;
          case 'post_video_view_time_by_country_id':
            if (typeof value === 'object' && value !== null) {
              metrics.video_view_time_by_country = Object.entries(value).map(
                ([key, val]) => ({
                  key,
                  value: Number(val),
                }),
              );
            }
            break;

          // Video Distribution
          case 'post_video_views_by_distribution_type':
            if (typeof value === 'object' && value !== null) {
              metrics.video_views_by_distribution_type = value;
            }
            break;
          case 'post_video_view_time_by_distribution_type':
            if (typeof value === 'object' && value !== null) {
              metrics.video_view_time_by_distribution_type = value;
            }
            break;

          // Video Retention
          case 'post_video_retention_graph_clicked_to_play':
            if (typeof value === 'object' && value !== null) {
              metrics.video_retention_graph_clicked_to_play = Object.entries(
                value,
              ).map(([time, rate]) => ({
                time: parseInt(time),
                rate: Number(rate),
              }));
            }
            break;
          case 'post_video_retention_graph_autoplayed':
            if (typeof value === 'object' && value !== null) {
              metrics.video_retention_graph_autoplayed = Object.entries(
                value,
              ).map(([time, rate]) => ({
                time: parseInt(time),
                rate: Number(rate),
              }));
            }
            break;

          // Social Actions
          case 'post_video_social_actions_count_unique':
            metrics.video_social_actions_unique =
              typeof value === 'number' ? value : 0;
            break;

          // Activity
          case 'post_activity_by_action_type':
            if (typeof value === 'object' && value !== null) {
              metrics.activity_by_action_type = Object.entries(value).map(
                ([action_type, val]) => ({
                  action_type,
                  value: Number(val),
                }),
              );
            }
            break;
          case 'post_activity_by_action_type_unique':
            if (typeof value === 'object' && value !== null) {
              metrics.activity_by_action_type_unique = Object.entries(
                value,
              ).map(([action_type, val]) => ({
                action_type,
                value: Number(val),
              }));
            }
            break;
        }
      }

      return metrics;
    } catch (error) {
      console.error('Error fetching Facebook post insights');
      if (error instanceof AxiosError) {
        console.error(error.response?.data);
      }

      // Return empty metrics object on error
      return {};
    }
  }

  private async mapFacebookPostToPlatformPost(
    post: FacebookPost,
    account: SocialAccount,
  ): Promise<PlatformPost> {
    // Fetch insights for the post
    const insights = await this.fetchPostInsights(
      post.id,
      account.access_token,
    );

    return {
      provider: 'facebook',
      id: post.id,
      account_id: account.social_provider_user_id,
      caption: post.message || '',
      url: post.permalink_url || '',
      media: post.full_picture
        ? [{ url: post.full_picture, thumbnail_url: post.full_picture }]
        : [],
      metrics: {
        ...insights,
        // Include basic metrics from the post object as fallback
        comments: post.comments?.summary?.total_count ?? 0,
        shares: post.shares?.count ?? 0,
      },
    };
  }
}
