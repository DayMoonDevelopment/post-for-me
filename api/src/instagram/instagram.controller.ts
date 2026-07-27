import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AxiosError } from 'axios';

import { User } from '../auth/user.decorator';
import type { RequestUser } from '../auth/user.interface';

import { Protect } from '../auth/protect.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { InstagramService } from './instagram.service';
import {
  InstagramAudioQueryDto,
  InstagramAudioResponseDto,
} from './dto/instagram-audio.dto';
import type { SocialAccount } from '../lib/dto/global.dto';

@Controller('instagram-audio')
@ApiTags('Instagram Audio')
@ApiBearerAuth()
@Protect()
export class InstagramController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly instagramService: InstagramService,
  ) {}

  @Get(':social_account_id')
  @ApiOperation({
    summary: 'Search Instagram audio',
    description: `Search Meta's audio catalog for music or original sounds that can be attached to an Instagram Reel via the \`audio_configuration\` platform configuration. Returns trending audio when no search query is provided. Only available for Instagram accounts connected with Facebook Login.`,
  })
  @ApiParam({
    name: 'social_account_id',
    description: 'The id of the Instagram social account to search with',
  })
  @ApiOkResponse({
    description: 'List of audio assets matching the search',
    type: InstagramAudioResponseDto,
  })
  async searchAudio(
    @Param('social_account_id') socialAccountId: string,
    @Query() queryParams: InstagramAudioQueryDto,
    @User() user: RequestUser,
  ): Promise<InstagramAudioResponseDto> {
    const { data: account, error: accountError } =
      await this.supabaseService.supabaseClient
        .from('social_provider_connections')
        .select(
          'id, provider, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_user_id, social_provider_user_name, social_provider_metadata',
        )
        .eq('id', socialAccountId)
        .eq('project_id', user.projectId)
        .eq('provider', 'instagram')
        .single();

    if (accountError || !account) {
      throw new HttpException('Unable to fetch account', HttpStatus.NOT_FOUND);
    }

    if (!account.access_token) {
      throw new HttpException(
        'Account has no access token, please reconnect the account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const socialAccount: SocialAccount = {
      provider: account.provider,
      id: account.id,
      social_provider_user_name: account.social_provider_user_name,
      access_token: account.access_token || '',
      refresh_token: account.refresh_token,
      access_token_expires_at: new Date(
        account.access_token_expires_at || new Date(),
      ),
      refresh_token_expires_at: account.refresh_token_expires_at
        ? new Date(account.refresh_token_expires_at)
        : null,
      social_provider_user_id: account.social_provider_user_id,
      social_provider_metadata: account.social_provider_metadata,
    };

    // The Audio API is only available on the Instagram API with Facebook
    // Login; direct Instagram Login connections are not supported by Meta.
    if (
      !this.instagramService
        .getApiBaseUrl(socialAccount)
        .includes('graph.facebook.com')
    ) {
      throw new HttpException(
        'Audio search is only available for Instagram accounts connected with Facebook Login',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.instagramService.searchAudio({
        account: socialAccount,
        audioType: queryParams.audio_type,
        searchQuery: queryParams.search_query,
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        const metaError = error.response?.data as
          | { error?: { message?: string } }
          | undefined;

        const status = error.response?.status;

        throw new HttpException(
          metaError?.error?.message || 'Unable to search audio',
          status && status >= 400 && status < 500
            ? status
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Unable to search audio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
