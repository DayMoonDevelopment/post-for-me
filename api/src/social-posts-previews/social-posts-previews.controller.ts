import {
  Body,
  Controller,
  HttpException,
  Post,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSocialPostPreviewDto } from './dto/create-post-preview.dto';
import { SocialPostPreviewDto } from './dto/post-preview.dto';
import { SocialPostPreviewsService } from './social-posts-previews.service';

import { AppLogger } from '../logger/app-logger';

@Controller('social-post-previews')
@ApiTags('Social Post Previews')
export class SocialPostPreviewsController {
  constructor(
    private readonly socialPostsPreviewService: SocialPostPreviewsService,
    private readonly logger: AppLogger,
  ) {}

  @ApiResponse({
    status: 200,
    description: 'Previews created successfully.',
    type: SocialPostPreviewDto,
    isArray: true,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when fetching the Post.',
  })
  @ApiOperation({ summary: 'Create Post Previews' })
  @Post()
  createPreviews(
    @Body() createPreviewInput: CreateSocialPostPreviewDto,
  ): SocialPostPreviewDto[] {
    if (!createPreviewInput.preview_social_accounts) {
      throw new HttpException(
        'Preview Social Accounts are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return this.socialPostsPreviewService.createPostPreview(
        createPreviewInput,
      );
    } catch (error) {
      this.logger.errorWithMeta('createPreviews failed', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }
}
