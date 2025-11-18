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
export class PinterestService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'pinterest')
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
    const credentials = Buffer.from(
      `${this.appCredentials.appId}:${this.appCredentials.appSecret}`,
    ).toString('base64');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token || '',
    });

    let requestUrl = 'https://api.pinterest.com/v5/oauth/token';
    if (account.social_provider_metadata?.is_sandbox) {
      requestUrl = 'https://api-sandbox.pinterest.com/v5/oauth/token';
    }

    const refreshResponse = await axios.post(requestUrl, params.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, expires_in, refresh_token } = refreshResponse.data;
    const newExpirationDate = new Date(Date.now() + expires_in * 1000);

    account.access_token = access_token;
    account.refresh_token = refresh_token;
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

      let pinsUrl = 'https://api.pinterest.com/v5/pins';
      if (account.social_provider_metadata?.is_sandbox) {
        pinsUrl = 'https://api-sandbox.pinterest.com/v5/pins';
      }

      if (platformIds && platformIds.length > 0) {
        // Fetch specific pins by ID
        const pinPromises = platformIds.map((id) =>
          axios.get(`${pinsUrl}/${id}`, {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }),
        );

        const responses = await Promise.all(pinPromises);
        const posts: PlatformPost[] = responses.map((response) => {
          const pin = response.data;
          return {
            provider: 'pinterest',
            id: pin.id,
            account_id: account.social_provider_user_id,
            caption: pin.description || pin.title || '',
            url: pin.link || `https://pinterest.com/pin/${pin.id}`,
            media: [
              {
                url: pin.media?.images?.['600x']?.url || '',
                thumbnail_url: pin.media?.images?.['400x300']?.url || '',
              },
            ],
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

      // Get user's pins
      const response = await axios.get(pinsUrl, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
        params: {
          page_size: safeLimit,
        },
      });

      const posts: PlatformPost[] = (response.data.items || []).map(
        (pin: any) => ({
          provider: 'pinterest',
          id: pin.id,
          account_id: account.social_provider_user_id,
          caption: pin.description || pin.title || '',
          url: pin.link || `https://pinterest.com/pin/${pin.id}`,
          media: [
            {
              url: pin.media?.images?.['600x']?.url || '',
              thumbnail_url: pin.media?.images?.['400x300']?.url || '',
            },
          ],
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
        has_more: !!response.data.bookmark,
        cursor: response.data.bookmark,
      };
    } catch (error) {
      console.error('Error fetching Pinterest pins:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
