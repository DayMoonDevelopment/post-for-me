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
export class ThreadsService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'threads')
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
    const refreshResponse = await axios.get(
      'https://graph.threads.net/refresh_access_token',
      {
        params: {
          grant_type: 'th_refresh_token',
          access_token: account.access_token,
        },
      },
    );

    const { access_token, expires_in } = refreshResponse.data;
    const newExpirationDate = new Date(Date.now() + expires_in * 1000);
    newExpirationDate.setSeconds(newExpirationDate.getSeconds() - 300);

    account.access_token = access_token;
    account.access_token_expires_at = newExpirationDate;

    return account;
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
        // Fetch specific threads by ID
        const threadPromises = platformIds.map((id) =>
          axios.get(`https://graph.threads.net/v1.0/${id}`, {
            params: {
              fields: 'id,text,permalink,timestamp,media_type,media_url',
              access_token: account.access_token,
            },
          }),
        );

        const responses = await Promise.all(threadPromises);
        const posts: PlatformPost[] = responses.map((response) => {
          const thread = response.data;
          return {
            provider: 'threads',
            id: thread.id,
            account_id: account.social_provider_user_id,
            caption: thread.text || '',
            url: thread.permalink || '',
            media: thread.media_url
              ? [{ url: thread.media_url, thumbnail_url: thread.media_url }]
              : [],
            metrics: {
              likes: 0,
              comments: 0,
              shares: 0,
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

      // Fetch threads from user's profile
      const response = await axios.get(
        `https://graph.threads.net/v1.0/me/threads`,
        {
          params: {
            fields: 'id,text,permalink,timestamp,media_type,media_url',
            access_token: account.access_token,
            limit: safeLimit,
          },
        },
      );

      const posts: PlatformPost[] = (response.data.data || []).map(
        (thread: any) => ({
          provider: 'threads',
          id: thread.id,
          account_id: account.social_provider_user_id,
          caption: thread.text || '',
          url: thread.permalink || '',
          media: thread.media_url
            ? [{ url: thread.media_url, thumbnail_url: thread.media_url }]
            : [],
          metrics: {
            likes: 0,
            comments: 0,
            shares: 0,
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
      console.error('Error fetching Threads posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
