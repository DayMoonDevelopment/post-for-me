import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  HttpStatus,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Protect } from '../auth/protect.decorator';
import { Paginated } from '../pagination/paginated.decorator';
import { PaginatedResponse } from '../pagination/pagination-response.interface';
import { PaginationService } from '../pagination/pagination.service';
import { User } from '../auth/user.decorator';

import { SocialPostsService } from './social-posts.service';
import { SocialPostDto, PostStatus } from './dto/post.dto';
import { CreateSocialPostDto } from './dto/create-post.dto';
import { InvalidSocialPostDto } from './dto/post-validation.dto';

import { RequestUser } from '../auth/user.interface';
import { SocialPostQueryDto } from './dto/post-query.dto';
import { DeleteEntityResponseDto } from '../lib/dto/global.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { tasks } from '@trigger.dev/sdk';
import { PROCESS_WEBHOOK_TASK } from 'src/constants/string.constants';

@Controller('social-posts')
@ApiTags('Social Posts')
@ApiBearerAuth()
@Protect()
export class SocialPostsController {
  constructor(
    private readonly postsService: SocialPostsService,
    private readonly paginationService: PaginationService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Paginated(SocialPostDto, { name: 'posts' })
  async getAllPosts(
    @Query() query: SocialPostQueryDto,
    @User() user: RequestUser,
  ): Promise<PaginatedResponse<SocialPostDto>> {
    try {
      return this.paginationService.createResponse(
        this.postsService.buildPostQuery(query, user.projectId),
        query,
      );
    } catch (e) {
      console.error('[getAllPosts] Error:', e);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }
  }

  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully.',
    type: SocialPostDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found based on the given ID.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when fetching the Post.',
  })
  @ApiOperation({ summary: 'Get Post by ID' })
  @ApiParam({
    name: 'id',
    description: 'Post ID',
    type: String,
    required: true,
  })
  @Get(':id')
  async getPost(
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<SocialPostDto> {
    let post: SocialPostDto | null = null;
    try {
      post = await this.postsService.getPostById(params.id, user.projectId);
    } catch (error) {
      console.error('[getPost] Error:', error);
      throw new HttpException('Internal Server Error', 500);
    }

    if (!post) {
      throw new HttpException('Post not found', 404);
    }

    return post;
  }

  @ApiResponse({
    status: 200,
    description: 'Post created successfully.',
    type: SocialPostDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request.',
    type: InvalidSocialPostDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when fetching the Post.',
  })
  @ApiOperation({ summary: 'Create Post' })
  @Post()
  async createPosts(
    @Body() createPostsInput: CreateSocialPostDto,
    @User() user: RequestUser,
  ): Promise<SocialPostDto> {
    const project = await this.supabaseService.supabaseClient
      .from('projects')
      .select('is_system')
      .eq('id', user.projectId)
      .single();

    const isSystem = project.data?.is_system || false;

    const postValidation = await this.postsService.validatePost({
      post: createPostsInput,
      projectId: user.projectId,
      teamId: user.teamId,
      isSystem,
    });

    if (!postValidation.isValid) {
      throw new HttpException(
        {
          statusCode: 400,
          message: 'Invalid Request',
          errors: postValidation.errors,
        },
        400,
      );
    }

    try {
      const createPosts = await this.postsService.createPost({
        post: createPostsInput,
        projectId: user.projectId,
        apiKey: user.apiKey,
        teamId: user.teamId,
        isSystem,
      });

      if (!createPosts) {
        throw new Error('Unable to create post');
      }

      await tasks.trigger(PROCESS_WEBHOOK_TASK, {
        projectId: user.projectId,
        eventType: 'social.post.created',
        eventData: createPosts,
      });
      return createPosts;
    } catch (error) {
      console.error('[createPosts] Error:', error);
      throw new HttpException('Internal Server Error', 500);
    }
  }

  @ApiOperation({ summary: 'Update Post' })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully.',
    type: SocialPostDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request.',
    type: InvalidSocialPostDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when updating the Post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID',
    type: String,
    required: true,
  })
  @Put(':id')
  async updatePost(
    @Body() updatePostInput: CreateSocialPostDto,
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<SocialPostDto> {
    let post: SocialPostDto | null = null;
    const postToUpdate = await this.postsService.getPostById(
      params.id,
      user.projectId,
    );

    if (!postToUpdate) {
      throw new HttpException('Post not found', 404);
    }

    if (postToUpdate.status === PostStatus.PROCESSED) {
      throw new HttpException('Post has already been processed', 400);
    }

    const project = await this.supabaseService.supabaseClient
      .from('projects')
      .select('is_system')
      .eq('id', user.projectId)
      .single();

    const isSystem = project.data?.is_system || false;

    const postValidation = await this.postsService.validatePost({
      post: updatePostInput,
      projectId: user.projectId,
      teamId: user.teamId,
      isSystem,
    });

    if (!postValidation.isValid) {
      throw new HttpException(
        {
          statusCode: 400,
          message: 'Invalid Request',
          errors: postValidation.errors,
        },
        400,
      );
    }

    try {
      post = await this.postsService.updatePost({
        post: updatePostInput,
        postId: params.id,
        projectId: user.projectId,
        apiKey: user.apiKey,
        teamId: user.teamId,
        isSystem,
      });
    } catch (error) {
      console.error('[updatePost] Error:', error);
      throw new HttpException('Internal Server Error', 500);
    }

    if (!post) {
      throw new HttpException('Post not found', 404);
    }

    await tasks.trigger(PROCESS_WEBHOOK_TASK, {
      projectId: user.projectId,
      eventType: 'social.post.updated',
      eventData: post,
    });
    return post;
  }

  @ApiOperation({ summary: 'Delete Post' })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully.',
    type: DeleteEntityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when deleting the Post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID',
    type: String,
    required: true,
  })
  @Delete(':id')
  async deletePost(
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<DeleteEntityResponseDto> {
    const post = await this.postsService.getPostById(params.id, user.projectId);

    if (!post) {
      throw new HttpException('Post not found', 404);
    }

    if (post.status !== PostStatus.SCHEDULED) {
      throw new HttpException('Can only delete scheduled posts', 400);
    }

    try {
      const deleteResponse = await this.postsService.deletePost({
        postId: params.id,
        projectId: user.projectId,
      });

      await tasks.trigger(PROCESS_WEBHOOK_TASK, {
        projectId: user.projectId,
        eventType: 'social.post.deleted',
        eventData: post,
      });
      return deleteResponse;
    } catch (error) {
      console.error('[deletePost] Error:', error);
      throw new HttpException('Internal Server Error', 500);
    }
  }
}
