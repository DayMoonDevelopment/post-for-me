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
import { platformAudioControllerDescription } from './docs/platform-audio-controller.md';

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
    description: platformAudioControllerDescription,
  })
  @ApiParam({
    name: 'social_account_id',
    description:
      'ID of a connected social account in the authenticated project',
    type: String,
  })
  @ApiOkResponse({ type: PlatformAudioResponseDto })
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
