import { Injectable } from '@nestjs/common';
import { differenceInDays } from 'date-fns';
import { SupabaseService } from '../supabase/supabase.service';
import { SocialAccount } from '../lib/dto/global.dto';
import { SocialPlatformService } from '../lib/social-provider-service';
import { TikTokBusinessService } from '../tiktok-business/tiktok-business.service';
import { YouTubeError, YouTubeService } from '../youtube/youtube.service';
import { TikTokService } from '../tiktok/tiktok.service';
import { InstagramService } from '../instagram/instagram.service';
import { FacebookService } from '../facebook/facebook.service';
import { LinkedInService } from '../linkedin/linkedin.service';
import { PinterestService } from '../pinterest/pinterest.service';
import { ThreadsService } from '../threads/threads.service';
import { TwitterService } from '../twitter/twitter.service';
import { BlueskyService } from '../bluesky/bluesky.service';

@Injectable()
export class TokenRefreshService {
  platformsToAlwaysRefresh = ['youtube', 'bluesky'];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly tiktokBusinessService: TikTokBusinessService,
    private readonly youtubeService: YouTubeService,
    private readonly tiktokService: TikTokService,
    private readonly instagramService: InstagramService,
    private readonly facebookService: FacebookService,
    private readonly linkedinService: LinkedInService,
    private readonly pinterestService: PinterestService,
    private readonly threadsService: ThreadsService,
    private readonly twitterService: TwitterService,
    private readonly blueskyService: BlueskyService,
  ) {}

  resolvePlatformName(account: {
    provider: SocialAccount['provider'];
    access_token: string | null;
    social_provider_metadata: unknown;
  }): string {
    let platformName = account.provider as string;

    if (
      platformName === 'instagram' &&
      !account.access_token?.startsWith('IG')
    ) {
      platformName = 'instagram_w_facebook';
    }

    if (
      platformName === 'x' &&
      (account.social_provider_metadata as { connection_type?: string } | null)
        ?.connection_type === 'oauth2'
    ) {
      platformName = 'x_oauth2';
    }

    return platformName;
  }

  async getPlatformService({
    platform,
    projectId,
  }: {
    platform: string;
    projectId: string;
  }): Promise<SocialPlatformService> {
    switch (platform) {
      case 'tiktok_business':
        await this.tiktokBusinessService.initService(projectId);
        return this.tiktokBusinessService;
      case 'youtube':
        await this.youtubeService.initService(projectId);
        return this.youtubeService;
      case 'tiktok':
        await this.tiktokService.initService(projectId);
        return this.tiktokService;
      case 'instagram':
        await this.instagramService.initService(projectId);
        return this.instagramService;
      case 'instagram_w_facebook':
        await this.instagramService.initFacebookService(projectId);
        return this.instagramService;
      case 'facebook':
        await this.facebookService.initService(projectId);
        return this.facebookService;
      case 'linkedin':
        await this.linkedinService.initService(projectId);
        return this.linkedinService;
      case 'pinterest':
        await this.pinterestService.initService(projectId);
        return this.pinterestService;
      case 'threads':
        await this.threadsService.initService(projectId);
        return this.threadsService;
      case 'x':
        await this.twitterService.initService(projectId);
        return this.twitterService;
      case 'x_oauth2':
        await this.twitterService.initOAuth2Service(projectId);
        return this.twitterService;
      case 'bluesky':
        await this.blueskyService.initService();
        return this.blueskyService;
    }
    throw new Error('Unable to create platform service');
  }

  async refreshIfNeeded({
    account,
    projectId,
  }: {
    account: SocialAccount;
    projectId: string;
  }): Promise<SocialAccount> {
    if (!account.access_token) {
      return account;
    }

    const needsRefresh =
      this.platformsToAlwaysRefresh.includes(account.provider as string) ||
      differenceInDays(
        account.access_token_expires_at || new Date(),
        new Date(),
      ) <= 7;

    if (!needsRefresh) {
      return account;
    }

    const platformName = this.resolvePlatformName(account);

    try {
      const platformService = await this.getPlatformService({
        platform: platformName,
        projectId,
      });

      const updatedAccount = await platformService.refreshAccessToken(account);

      if (!updatedAccount) {
        return account;
      }

      await this.supabaseService.supabaseClient
        .from('social_provider_connections')
        .update({
          access_token: updatedAccount.access_token,
          refresh_token: updatedAccount.refresh_token,
          access_token_expires_at:
            updatedAccount.access_token_expires_at?.toISOString(),
          refresh_token_expires_at:
            updatedAccount.refresh_token_expires_at?.toISOString(),
        })
        .eq('id', account.id);

      return updatedAccount;
    } catch (error) {
      if (
        account.provider === 'youtube' &&
        error instanceof YouTubeError &&
        !error.metadata.authFailure &&
        error.metadata.retryable
      ) {
        console.warn('Proceeding with existing YouTube access token', {
          provider: error.metadata.provider,
          operation: error.metadata.operation,
          code: error.metadata.code,
          status: error.metadata.status,
          message: error.message,
        });
        return account;
      }

      throw error;
    }
  }
}
