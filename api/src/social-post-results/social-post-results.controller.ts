import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PostResultsService } from './social-post-results.service';
import { SocialPostResultDto } from './dto/post-results.dto';
import { SocialPostResultQueryDto } from './dto/post-results.query.dto';

import { Paginated } from '../pagination/paginated.decorator';
import { PaginationService } from '../pagination/pagination.service';
import type { PaginatedResponse } from '../pagination/pagination-response.interface';

import { User } from '../auth/user.decorator';
import type { RequestUser } from '../auth/user.interface';

import { Protect } from '../auth/protect.decorator';

import { AppLogger } from '../logger/app-logger';

@Controller('social-post-results')
@ApiTags('Social Post Results')
@ApiBearerAuth()
@Protect()
export class SocialPostResultsController {
  private readonly logger = new AppLogger(SocialPostResultsController.name);

  constructor(
    private readonly postResultsService: PostResultsService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get()
  @Paginated(SocialPostResultDto, { name: 'post results' })
  getAllPostResults(
    @Query() query: SocialPostResultQueryDto,
    @User() user: RequestUser,
  ): Promise<PaginatedResponse<SocialPostResultDto>> {
    try {
      return this.paginationService.createResponse(
        this.postResultsService.getPostResults(query, user.projectId),
        query,
      );
    } catch (e) {
      this.logger.errorWithMeta('getAllPostResults failed', e, {
        projectId: user.projectId,
        query,
      });
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Post result retrieved successfully.',
    type: SocialPostResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post result not found based on the given ID.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when fetching the post result.',
  })
  @ApiOperation({ summary: 'Get post result by ID' })
  @ApiParam({
    name: 'id',
    description: 'Post Result ID',
    type: String,
    required: true,
  })
  async getPostResult(
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<SocialPostResultDto> {
    let postResult: SocialPostResultDto | null;

    try {
      postResult = await this.postResultsService.getPostResultById(
        params.id,
        user.projectId,
      );
    } catch (e) {
      this.logger.errorWithMeta('getPostResult failed', e, {
        projectId: user.projectId,
        postResultId: params.id,
      });
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }

    if (!postResult) {
      throw new HttpException('Post result not found', HttpStatus.NOT_FOUND);
    }

    return postResult;
  }
}
