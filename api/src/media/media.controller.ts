import {
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { MediaService } from './media.service';
import { Protect } from '../auth/protect.decorator';
import { User } from '../auth/user.decorator';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CreateUploadUrlResponseDto } from './dto/create-upload-url-response.dto';
import {
  CreateSignedReadUrlDto,
  CreateSignedReadUrlResponseDto,
} from './dto/create-signed-read-url.dto';
import { createUploadUrlDescription } from './docs/create-upload-url.md';
import type { RequestUser } from '../auth/user.interface';

@Controller('media')
@ApiTags('Media')
@ApiBearerAuth()
@Protect()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({
    summary: 'Upload media',
    description: createUploadUrlDescription,
  })
  @ApiBody({ type: CreateUploadUrlDto })
  @ApiOkResponse({
    description: 'Upload credentials and media URL created successfully.',
    type: CreateUploadUrlResponseDto,
  })
  @Post('create-upload-url')
  async createUploadUrl(
    @User() user: RequestUser,
    @Body() body: CreateUploadUrlDto,
  ): Promise<CreateUploadUrlResponseDto> {
    try {
      return await this.mediaService.createUploadUrl(
        user.projectId,
        body.mime_type,
      );
    } catch (e) {
      console.error('/media/create-upload-url', e);
      throw new HttpException(
        'Failed to create upload url',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: e },
      );
    }
  }

  @ApiOperation({
    summary: 'Create a signed read URL for private media access',
  })
  @ApiBody({ type: CreateSignedReadUrlDto })
  @ApiOkResponse({
    description: 'Signed read URL generated successfully.',
    type: CreateSignedReadUrlResponseDto,
  })
  @Post('signed-read-url')
  async createSignedReadUrl(
    @User() user: RequestUser,
    @Body() body: CreateSignedReadUrlDto,
  ): Promise<CreateSignedReadUrlResponseDto> {
    try {
      const signed_url = await this.mediaService.createSignedReadUrl(
        user.projectId,
        body.key,
        body.expires_in,
      );
      return { signed_url };
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      console.error('/media/signed-read-url', e);
      throw new HttpException(
        'Failed to create signed read URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: e },
      );
    }
  }
}
