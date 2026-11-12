import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { differenceInDays } from 'date-fns';
import axios, { AxiosError } from 'axios';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import type { PinterestPostMetricsDto } from './dto/pinterest-post-metrics.dto';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  PinterestBoardDto,
  PinterestBoardsResponseDto,
} from './dto/pinterest-board.dto';
import type { PinterestBoardsQueryDto } from './dto/pinterest-boards-query.dto';

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

interface PinterestCarouselSlot {
  media?: PinterestMedia;
  image_metadata?: {
    images?: PinterestMedia['images'];
  };
}

interface PinterestCarouselData {
  carousel_slots?: PinterestCarouselSlot[];
}

interface PinterestPin {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  media?: PinterestMedia;
  carousel_data?: PinterestCarouselData;
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

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async getBoards(
    accountId: string,
    projectId: string,
    query: PinterestBoardsQueryDto,
  ): Promise<PinterestBoardsResponseDto> {
    const { data: account, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .select(
        'id, provider, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_user_id, social_provider_user_name, social_provider_metadata',
      )
      .eq('id', accountId)
      .eq('project_id', projectId)
      .single();

    if (error || !account) {
      throw new NotFoundException('Social account not found');
    }
    if (account.provider !== 'pinterest') {
      throw new BadRequestException(
        'Social account must be a Pinterest account',
      );
    }

    try {
      await this.initService(projectId);
      let socialAccount: SocialAccount = {
        ...account,
        access_token: account.access_token || '',
        access_token_expires_at: account.access_token_expires_at
          ? new Date(account.access_token_expires_at)
          : null,
        refresh_token_expires_at: account.refresh_token_expires_at
          ? new Date(account.refresh_token_expires_at)
          : null,
      };

      if (
        differenceInDays(
          socialAccount.access_token_expires_at || new Date(),
          new Date(),
        ) <= 7
      ) {
        socialAccount = await this.refreshAccessToken(socialAccount);
        const { error: updateError } = await this.supabaseService.supabaseClient
          .from('social_provider_connections')
          .update({
            access_token: socialAccount.access_token,
            refresh_token: socialAccount.refresh_token,
            access_token_expires_at:
              socialAccount.access_token_expires_at?.toISOString(),
            refresh_token_expires_at:
              socialAccount.refresh_token_expires_at?.toISOString(),
          })
          .eq('id', accountId)
          .eq('project_id', projectId);
        if (updateError) {
          throw new InternalServerErrorException(
            'Unable to save refreshed Pinterest credentials',
          );
        }
      }

      const metadata = socialAccount.social_provider_metadata as {
        is_sandbox?: boolean;
      } | null;
      const baseUrl = metadata?.is_sandbox
        ? 'https://api-sandbox.pinterest.com/v5'
        : 'https://api.pinterest.com/v5';
      // /boards includes owned + collaborative boards. No privacy filter: return
      // everything Pinterest exposes to this token, one upstream page at a time.
      const { data } = await axios.get<{
        items: PinterestBoardDto[];
        bookmark?: string | null;
      }>(`${baseUrl}/boards`, {
        headers: { Authorization: `Bearer ${socialAccount.access_token}` },
        params: { page_size: query.limit, bookmark: query.cursor },
      });
      const cursor = data.bookmark || '';
      let next: string | null = null;
      if (cursor) {
        const url = new URL(
          this.request.path,
          this.configService.get<string>('API_BASE_URL') ??
            'https://api.postforme.dev/',
        );
        url.searchParams.set('limit', String(query.limit));
        url.searchParams.set('cursor', cursor);
        next = url.toString();
      }
      return {
        data: data.items,
        meta: { cursor, limit: query.limit, next, has_more: !!cursor },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        // Never expose upstream bodies/configs: they can contain credentials.
        if (status && [400, 401, 403, 429].includes(status)) {
          throw new HttpException(
            'Pinterest request failed. Check the connected account permissions or reconnect the account.',
            status,
          );
        }
        throw new BadGatewayException('Unable to fetch Pinterest boards');
      }
      throw new InternalServerErrorException(
        'Unable to fetch Pinterest boards',
      );
    }
  }

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

  private getImageFromVariants(
    images: PinterestMedia['images'] | undefined,
  ): { url: string; thumbnail_url?: string } | null {
    const url =
      images?.['1200x']?.url ||
      images?.['600x']?.url ||
      images?.['400x300']?.url ||
      images?.['150x150']?.url;

    if (!url) {
      return null;
    }

    const thumbnailUrl = images?.['400x300']?.url || images?.['150x150']?.url;

    return thumbnailUrl && thumbnailUrl !== url
      ? { url, thumbnail_url: thumbnailUrl }
      : { url };
  }

  private getPinMedia(pin: PinterestPin): {
    url: string;
    thumbnail_url?: string;
  }[] {
    const carouselMedia =
      pin.carousel_data?.carousel_slots
        ?.map((slot) =>
          this.getImageFromVariants(
            slot.media?.images || slot.image_metadata?.images,
          ),
        )
        .filter(
          (slot): slot is { url: string; thumbnail_url?: string } =>
            slot !== null,
        ) || [];

    if (carouselMedia.length > 0) {
      return carouselMedia;
    }

    const mainMedia = this.getImageFromVariants(pin.media?.images);
    return mainMedia ? [mainMedia] : [];
  }

  private mapPinToPlatformPost(
    pin: PinterestPin,
    account: SocialAccount,
    includeMetrics: boolean,
  ): PlatformPost {
    return {
      provider: 'pinterest',
      id: pin.id,
      account_id: account.social_provider_user_id,
      caption: pin.description || pin.title || '',
      url: pin.link || `https://pinterest.com/pin/${pin.id}`,
      media: this.getPinMedia(pin),
      metrics: includeMetrics ? pin.pin_metrics : undefined,
    };
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
        const posts: PlatformPost[] = responses.map((response) =>
          this.mapPinToPlatformPost(response.data, account, includeMetrics),
        );

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

      const posts: PlatformPost[] = (response.data.items || []).map((pin) =>
        this.mapPinToPlatformPost(pin, account, includeMetrics),
      );

      return {
        posts,
        count: posts.length,
        has_more: !!response.data.bookmark,
        cursor: response.data.bookmark,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Error fetching Pinterest pins', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        });
      } else if (error instanceof Error) {
        console.error('Error fetching Pinterest pins', {
          message: error.message,
        });
      } else {
        console.error('Error fetching Pinterest pins');
      }
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
