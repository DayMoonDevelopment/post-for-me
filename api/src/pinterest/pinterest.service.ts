import { Injectable, Scope } from '@nestjs/common';
import axios from 'axios';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import type { PinterestPostMetricsDto } from './dto/pinterest-post-metrics.dto';
import { SupabaseService } from '../supabase/supabase.service';

// Pinterest API Types
interface PinterestImageVariant {
  url: string;
  width: number;
  height: number;
}

interface PinterestMedia {
  images?: {
    '150x150'?: PinterestImageVariant;
    '400x300'?: PinterestImageVariant;
    '600x'?: PinterestImageVariant;
    '1200x'?: PinterestImageVariant;
  };
  media_type?: 'image' | 'video';
}

interface PinterestPin {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  media?: PinterestMedia;
  board_id?: string;
  created_at?: string;
  note?: string;
  pin_metrics?: PinterestPostMetricsDto;
}

interface PinterestPinsResponse {
  items: PinterestPin[];
  bookmark?: string;
}

interface PinterestTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  scope: string;
}

@Injectable({ scope: Scope.REQUEST })
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
    const accountMetadata = account.social_provider_metadata as {
      is_sandbox: boolean;
    };
    if (accountMetadata?.is_sandbox) {
      requestUrl = 'https://api-sandbox.pinterest.com/v5/oauth/token';
    }

    const refreshResponse = await axios.post<PinterestTokenResponse>(
      requestUrl,
      params.toString(),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

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
      const safeLimit = Math.min(limit, 25);

      let pinsUrl = 'https://api.pinterest.com/v5/pins';
      const accountMetadata = account.social_provider_metadata as {
        is_sandbox: boolean;
      };
      if (accountMetadata?.is_sandbox) {
        pinsUrl = 'https://api-sandbox.pinterest.com/v5/pins';
      }

      if (platformIds && platformIds.length > 0) {
        // Fetch specific pins by ID
        const pinPromises = platformIds.map((id) =>
          axios.get<PinterestPin>(`${pinsUrl}/${id}`, {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
            params: includeMetrics
              ? {
                  pin_metrics: true,
                }
              : undefined,
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
            metrics: includeMetrics ? pin.pin_metrics : undefined,
          };
        });

        return {
          posts,
          count: posts.length,
          has_more: false,
        };
      }

      // Get user's pins
      const response = await axios.get<PinterestPinsResponse>(pinsUrl, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
        params: {
          page_size: safeLimit,
          bookmark: cursor,
          pin_metrics: includeMetrics ? true : undefined,
        },
      });

      const posts: PlatformPost[] = (response.data.items || []).map(
        (pin: PinterestPin) => ({
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
          metrics: includeMetrics ? pin.pin_metrics : undefined,
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
