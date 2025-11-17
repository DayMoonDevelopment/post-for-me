import { Injectable } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPost,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios from 'axios';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TikTokBusinessService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  tokenUrl: string;
  apiUrl: string;

  constructor(private readonly supabaseService: SupabaseService) {
    this.tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/';
  }

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseClient
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'tiktok_business')
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
    const formData = new URLSearchParams();
    formData.append('client_key', this.appCredentials.appId);
    formData.append('client_secret', this.appCredentials.appSecret);
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', account.refresh_token!);

    const refreshResponse = await axios.post(this.tokenUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
    });

    const error = refreshResponse?.data as {
      error?: string;
      error_description?: string;
    };
    if (error) {
      throw new Error(
        `TikTok API error: ${error.error_description || error.error}`,
      );
    }

    const now = new Date();
    const { access_token, refresh_token, expires_in } =
      refreshResponse.data as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    const newExpirationDate = new Date(now.getTime() + expires_in * 1000);

    //Set expiration so it refreshes two days early
    newExpirationDate.setDate(newExpirationDate.getDate() - 2);

    account.access_token = access_token;
    account.refresh_token = refresh_token;
    account.access_token_expires_at = newExpirationDate;
    return account;
  }

  getAccountPosts({
    account,
    platformIds,
  }: {
    account: SocialAccount;
    platformIds?: string[];
  }): Promise<PlatformPost> {
    console.log(account, platformIds);

    throw new Error('Method not implemented.');
  }
}
