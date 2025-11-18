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

import { User } from '../auth/user.decorator';
import type { RequestUser } from '../auth/user.interface';

import { Protect } from '../auth/protect.decorator';
import { PlatformPostDto } from './dto/platform-post.dto';
import { PlatformPostQueryDto } from './dto/platform-post-query.dto';
import { SocialAccountFeedsService } from './social-account-feeds.service';
import { PaginatedPlatformPostResponse } from './dto/pagination-platform-post-response.dto';

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
            cursor: {
              type: 'string',
              description: 'Id representing the next page of items',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items returned.',
            },
            next: {
              type: 'string',
              nullable: true,
              description: 'URL to the next page of results, or null if none.',
              example:
                'https://api.postforme.dev/v1/items?cursor=pgn_xxxxx&limit=10',
            },
            has_more: {
              type: 'boolean',
              description: 'Indicates if there are more results or not',
            },
          },
          required: ['cursor', 'limit', 'next'],
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
  ): Promise<PaginatedPlatformPostResponse> {
    try {
      return this.socialPostFeedService.getPlatformPosts({
        accountId: params.social_account_id,
        queryParams: query,
        projectId: user.projectId,
      });
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

  // TODO: Discuss if endpoint to get single post is needed. Or if filter on paginated endpoint is enough.
}
