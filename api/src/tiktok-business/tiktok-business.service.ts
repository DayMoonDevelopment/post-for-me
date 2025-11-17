import { Injectable } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import axios from 'axios';

@Injectable()
export class TikTokBusinessService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;
  tokenUrl: string;

  constructor(appCredentials: SocialProviderAppCredentials) {
    this.appCredentials = appCredentials;
    this.tokenUrl = '';
  }

  refreshAccessToken(account: SocialAccount): Promise<SocialAccount> {
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
  }): Promise<string> {
    console.log(account, platformIds);

    throw new Error('Method not implemented.');
  }
}
