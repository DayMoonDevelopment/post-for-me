import { Injectable, Scope } from '@nestjs/common';
import { SocialPlatformService } from '../lib/social-provider-service';
import type {
  PlatformPostsResponse,
  SocialAccount,
  SocialProviderAppCredentials,
} from '../lib/dto/global.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ scope: Scope.REQUEST })
export class LinkedInService implements SocialPlatformService {
  appCredentials: SocialProviderAppCredentials;

  constructor(private readonly supabaseService: SupabaseService) {}

  async initService(projectId: string): Promise<void> {
    const { data: appCredentials, error: appCredentialsError } =
      await this.supabaseService.supabaseServiceRole
        .from('social_provider_app_credentials')
        .select()
        .eq('project_id', projectId)
        .eq('provider', 'linkedin')
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
    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token || '',
        client_id: this.appCredentials.appId,
        client_secret: this.appCredentials.appSecret,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to refresh LinkedIn token: ${data.error_description}`,
      );
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() - 300);

    account.access_token = data.access_token;
    account.access_token_expires_at = newExpiresAt;

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
      const safeLimit = Math.min(limit, 50);

      // LinkedIn API has limited post retrieval capabilities
      // This is a placeholder implementation
      const authorUrn =
        account.social_provider_metadata?.connection_type === 'page'
          ? `urn:li:organization:${account.social_provider_user_id}`
          : `urn:li:person:${account.social_provider_user_id}`;

      if (platformIds && platformIds.length > 0) {
        // Fetch specific posts - LinkedIn doesn't have a direct endpoint
        // Would need to use specific post URNs
        return {
          posts: [],
          count: 0,
          has_more: false,
        };
      }

      // LinkedIn doesn't provide a simple "get my posts" endpoint
      // This would require more complex implementation
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    } catch (error) {
      console.error('Error fetching LinkedIn posts:', error);
      return {
        posts: [],
        count: 0,
        has_more: false,
      };
    }
  }
}
