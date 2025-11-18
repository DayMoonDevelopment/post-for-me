import { Injectable } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios from 'axios';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
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

      if (!response.data.access_token) {
        throw new Error('No access token in refresh response');
      }

      account.access_token = response.data.access_token;
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
        const posts: PlatformPost[] = responses.map((response) => {
          const post = response.data;
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
              likes: post.likes?.summary?.total_count || 0,
              comments: post.comments?.summary?.total_count || 0,
              shares: post.shares?.count || 0,
              favorites: 0,
              reach: 0,
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
            },
          };
        });

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

      const posts: PlatformPost[] = (response.data.data || []).map(
        (post: any) => ({
          provider: 'facebook',
          id: post.id,
          account_id: account.social_provider_user_id,
          caption: post.message || '',
          url: post.permalink_url || '',
          media: post.full_picture
            ? [{ url: post.full_picture, thumbnail_url: post.full_picture }]
            : [],
          metrics: {
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0,
            favorites: 0,
            reach: 0,
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
          },
        }),
      );

      return {
        posts,
        count: posts.length,
        has_more: !!response.data.paging?.next,
        cursor: response.data.paging?.cursors?.after,
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
}
