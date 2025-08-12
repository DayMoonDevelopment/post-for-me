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

@Controller('social-post-previews')
@ApiTags('Social Post Previews')
export class SocialPostPreviewsController {
  constructor(
    private readonly socialPostsPreviewService: SocialPostPreviewsService,
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
  async createPreviews(
    @Body() createPreviewInput: CreateSocialPostPreviewDto,
  ): Promise<SocialPostPreviewDto[]> {
    if (!createPreviewInput.preview_social_accounts) {
      throw new HttpException(
        'Preview Social Accounts are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.socialPostsPreviewService.createPostPreview(
        createPreviewInput,
      );
    } catch (error) {
      console.error(error);
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
