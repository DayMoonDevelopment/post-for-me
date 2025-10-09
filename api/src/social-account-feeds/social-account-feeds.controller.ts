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
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { PaginationService } from '../pagination/pagination.service';
import type { PaginatedResponse } from '../pagination/pagination-response.interface';

import { User } from '../auth/user.decorator';
import type { RequestUser } from '../auth/user.interface';

import { Protect } from '../auth/protect.decorator';
import { PlatformPostDto } from './dto/platform-post.dto';
import { PlatformPostQueryDto } from './dto/platform-post-query.dto';
import { SocialAccountFeedsService } from './social-account-feeds.service';

@Controller('social-account-feeds')
@ApiTags('Social Account Feeds')
@ApiBearerAuth()
@Protect()
export class SocialAccountFeedsController {
  constructor(
    private readonly socialPostFeedService: SocialAccountFeedsService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get(':social_account_id')
  @ApiOperation({
    summary: `Get social account feed`,
    description: `Get a paginated result for the social account based on the applied filters`,
  })
  @ApiOkResponse({
    description: `Paginated data set for the social account feed.`,
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(PlatformPostDto) },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of items available.',
            },
            offset: {
              type: 'number',
              description: 'Number of items skipped.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items returned.',
            },
            next: {
              type: 'string',
              nullable: true,
              description: 'URL to the next page of results, or null if none.',
              example: 'https://api.postforme.dev/v1/items?offset=10&limit=10',
            },
          },
          required: ['total', 'offset', 'limit', 'next'],
        },
      },
      required: ['data', 'meta'],
    },
  })
  @ApiResponse({
    status: 500,
    description: `Internal server error when fetching social account feed.`,
  })
  @ApiParam({
    name: 'social_account_id',
    description: 'Social Account ID',
    type: String,
    required: true,
  })
  getAccountFeed(
    @Param() params: { social_account_id: string },
    @Query() query: PlatformPostQueryDto,
    @User() user: RequestUser,
  ): Promise<PaginatedResponse<PlatformPostDto>> {
    try {
      return this.paginationService.createResponse(
        this.socialPostFeedService.getPlatformPosts(query, user.projectId),
        query,
      );
    } catch (e) {
      console.error(e);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  @Get(':social_account_id/:platform_post_id')
  @ApiResponse({
    status: 200,
    description: 'Social account platform retrieved successfully.',
    type: PlatformPostDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account platform not found based on the given ID.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error when fetching the social account platform.',
  })
  @ApiOperation({
    summary: 'Get post by platform ID',
  })
  @ApiParam({
    name: 'social_account_id',
    description: 'Social Account ID',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'platform_post_id',
    description: 'Platform Post ID',
    type: String,
    required: true,
  })
  getAccountFeedPost(
    @Param() params: { social_account_id: string; platform_post_id: string },
    @Query() query: PlatformPostQueryDto,
    @User() user: RequestUser,
  ): Promise<PlatformPostDto> {
    try {
      console.log(query, user);

      throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    } catch (e) {
      console.error(e);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }
}
