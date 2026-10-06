import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InstagramService } from '../instagram/instagram.service';
import { TikTokBusinessService } from '../tiktok-business/tiktok-business.service';
import { InstagramAudioQueryDto } from '../instagram/dto/instagram-audio-query.dto';
import { TikTokBusinessAudioQueryDto } from '../tiktok-business/dto/tiktok-business-audio-query.dto';
import type { SocialAccount } from '../lib/dto/global.dto';
import type { SocialPlatformService } from '../lib/social-provider-service';
import type { PlatformAudioQueryDto } from '../lib/dto/platform-audio-query.dto';
import type { PlatformAudioResponseDto } from '../lib/dto/platform-audio.dto';

@Injectable()
export class PlatformAudioService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly instagramService: InstagramService,
    private readonly tiktokBusinessService: TikTokBusinessService,
  ) {}

  async getPlatformAudio({
    accountId,
    projectId,
    query,
  }: {
    accountId: string;
    projectId: string;
    query: PlatformAudioQueryDto;
  }): Promise<PlatformAudioResponseDto> {
    const { data: account, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .select(
        'id, provider, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_user_id, social_provider_user_name, social_provider_metadata',
      )
      .eq('id', accountId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('Unable to fetch social account');
    }
    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    const provider = account.provider;
    if (provider !== 'instagram' && provider !== 'tiktok_business') {
      throw new BadRequestException(
        'Platform audio is not supported for this platform',
      );
    }
    const metadata = account.social_provider_metadata as {
      connection_type?: string;
    } | null;
    if (
      provider === 'instagram' &&
      (metadata?.connection_type === 'instagram' ||
        account.access_token?.startsWith('IG'))
    ) {
      throw new BadRequestException(
        'Platform audio requires an Instagram account connected with Facebook Login',
      );
    }

    if (
      Object.keys(query.platform_configurations ?? {}).some(
        (key) => key !== provider,
      )
    ) {
      throw new BadRequestException(
        'Platform configurations must match the social account provider',
      );
    }
    const providerQuery: PlatformAudioQueryDto = {
      platform_configurations:
        provider === 'instagram'
          ? {
              instagram:
                query.platform_configurations?.instagram ??
                new InstagramAudioQueryDto(),
            }
          : {
              tiktok_business:
                query.platform_configurations?.tiktok_business ??
                new TikTokBusinessAudioQueryDto(),
            },
    };

    let socialAccount: SocialAccount = {
      ...account,
      access_token: account.access_token ?? '',
      access_token_expires_at: account.access_token_expires_at
        ? new Date(account.access_token_expires_at)
        : null,
      refresh_token_expires_at: account.refresh_token_expires_at
        ? new Date(account.refresh_token_expires_at)
        : null,
    };
    const platformService: SocialPlatformService =
      provider === 'instagram'
        ? this.instagramService
        : this.tiktokBusinessService;

    try {
      if (provider === 'instagram') {
        await this.instagramService.initFacebookService(projectId);
      } else {
        await platformService.initService(projectId);
      }

      // Match the feed's proactive seven-day refresh window.
      if (
        !socialAccount.access_token_expires_at ||
        socialAccount.access_token_expires_at.getTime() <=
          Date.now() + 7 * 24 * 60 * 60 * 1000
      ) {
        const refreshed =
          await platformService.refreshAccessToken(socialAccount);
        if (refreshed) {
          socialAccount = refreshed;
          const { error: updateError } =
            await this.supabaseService.supabaseClient
              .from('social_provider_connections')
              .update({
                access_token: refreshed.access_token,
                refresh_token: refreshed.refresh_token,
                access_token_expires_at:
                  refreshed.access_token_expires_at?.toISOString() ?? null,
                refresh_token_expires_at:
                  refreshed.refresh_token_expires_at?.toISOString() ?? null,
              })
              .eq('id', accountId)
              .eq('project_id', projectId);
          if (updateError) {
            throw new InternalServerErrorException(
              'Unable to persist refreshed social account credentials',
            );
          }
        }
      }

      const response = await platformService.getPlatformAudio({
        account: socialAccount,
        query: providerQuery,
      });
      return {
        data: response.data,
        // Neither supported provider documents pagination. Never relay provider URLs.
        meta: { count: response.data.length, has_more: false, next: null },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        const response = JSON.stringify(error.getResponse());
        const credentials = [
          account.access_token,
          account.refresh_token,
          socialAccount.access_token,
          socialAccount.refresh_token,
          provider === 'instagram'
            ? this.instagramService.appCredentials?.appSecret
            : this.tiktokBusinessService.appCredentials?.appSecret,
        ];
        if (
          credentials.some(
            (credential) =>
              credential &&
              (response.includes(JSON.stringify(credential).slice(1, -1)) ||
                response.includes(encodeURIComponent(credential))),
          )
        ) {
          throw new HttpException(
            'Unable to retrieve platform audio',
            error.getStatus(),
          );
        }
        throw error;
      }
      // Raw provider errors may contain request headers, tokens, or app secrets.
      throw new BadGatewayException('Unable to retrieve platform audio');
    }
  }
}
