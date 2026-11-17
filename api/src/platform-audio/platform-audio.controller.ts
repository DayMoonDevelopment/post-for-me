import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Protect } from '../auth/protect.decorator';
import { User } from '../auth/user.decorator';
import type { RequestUser } from '../auth/user.interface';
import {
  PLATFORM_AUDIO_VALIDATION_OPTIONS,
  PlatformAudioQueryDto,
} from './dto/platform-audio-query.dto';
import { PlatformAudioResponseDto } from './dto/platform-audio.dto';
import {
  InstagramAudioPlatformDataDto,
  InstagramPlatformAudioDto,
} from '../instagram/dto/instagram-audio.dto';
import {
  TikTokBusinessAudioPlatformDataDto,
  TikTokBusinessPlatformAudioDto,
} from '../tiktok-business/dto/tiktok-business-audio.dto';
import { PlatformAudioService } from './platform-audio.service';
import { TIKTOK_BUSINESS_AUDIO_GENRES } from '../tiktok-business/dto/tiktok-business-audio-query.dto';

@Controller('platform-audio')
@ApiTags('Platform Audio')
@ApiBearerAuth()
@Protect()
@ApiExtraModels(
  InstagramPlatformAudioDto,
  InstagramAudioPlatformDataDto,
  TikTokBusinessPlatformAudioDto,
  TikTokBusinessAudioPlatformDataDto,
)
export class PlatformAudioController {
  constructor(private readonly platformAudioService: PlatformAudioService) {}

  @Get(':social_account_id')
  @ApiOperation({
    summary: 'List platform audio for a social account',
    description:
      'List audio for the connected social account using provider-specific filters. Supports Instagram with Facebook Login and TikTok Business. Results are not paginated.',
  })
  @ApiParam({
    name: 'social_account_id',
    description:
      'ID of a connected social account in the authenticated project',
    type: String,
  })
  @ApiOkResponse({ type: PlatformAudioResponseDto })
  @ApiQuery({
    name: 'platform_configurations[instagram][audio_type]',
    required: false,
    enum: ['music', 'original_sound'],
    description: 'Instagram only. Defaults to music when omitted.',
  })
  @ApiQuery({
    name: 'platform_configurations[instagram][search_query]',
    required: false,
    type: String,
    description: 'Instagram only. Omit to retrieve trending audio.',
  })
  @ApiQuery({
    name: 'platform_configurations[tiktok_business][country_code]',
    required: false,
    type: String,
    description:
      'TikTok Business only. Uppercase ISO country code; defaults to US.',
  })
  @ApiQuery({
    name: 'platform_configurations[tiktok_business][date_range]',
    required: false,
    enum: ['1DAY', '7DAY', '30DAY', '90DAY'],
    description: 'TikTok Business only. Defaults to 7DAY when omitted.',
  })
  @ApiQuery({
    name: 'platform_configurations[tiktok_business][genre]',
    required: false,
    enum: TIKTOK_BUSINESS_AUDIO_GENRES,
    description: 'TikTok Business only. Defaults to ALL when omitted.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid filters or unsupported platform/connection',
  })
  @ApiNotFoundResponse({
    description: 'Social account not found in this project',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
  @ApiBadGatewayResponse({
    description:
      'Audio provider request failed or returned an invalid response',
  })
  getPlatformAudio(
    @Param('social_account_id') accountId: string,
    @Query(new ValidationPipe(PLATFORM_AUDIO_VALIDATION_OPTIONS))
    query: PlatformAudioQueryDto,
    @User() user: RequestUser,
  ): Promise<PlatformAudioResponseDto> {
    return this.platformAudioService.getPlatformAudio({
      accountId,
      projectId: user.projectId,
      query,
    });
  }
}
