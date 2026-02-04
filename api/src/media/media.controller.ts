import { Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { MediaService } from './media.service';
import { Protect } from '../auth/protect.decorator';
import { User } from '../auth/user.decorator';
import { CreateUploadUrlResponseDto } from './dto/create-upload-url-response.dto';
import { createUploadUrlDescription } from './docs/create-upload-url.md';
import type { RequestUser } from '../auth/user.interface';

import { AppLogger } from '../logger/app-logger';

@Controller('media')
@ApiTags('Media')
@ApiBearerAuth()
@Protect()
export class MediaController {
  private readonly logger = new AppLogger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({
    summary: 'Upload media',
    description: createUploadUrlDescription,
  })
  @ApiOkResponse({
    description: 'Signed upload URL and media record created successfully.',
    type: CreateUploadUrlResponseDto,
  })
  @Post('create-upload-url')
  async createUploadUrl(
    @User() user: RequestUser,
  ): Promise<CreateUploadUrlResponseDto> {
    try {
      return await this.mediaService.createUploadUrl(user.projectId);
    } catch (e) {
      this.logger.errorWithMeta('createUploadUrl failed', e, {
        projectId: user.projectId,
      });
      throw new HttpException(
        'Failed to create upload url',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: e },
      );
    }
  }
}
