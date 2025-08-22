import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Query,
  Post,
  Body,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SocialAccountsService } from './social-provider-connections.service';
import {
  DisconnectedSocialAccountDto,
  SocialAccountDto,
} from './dto/social-accounts.dto';
import { Protect } from '../auth/protect.decorator';
import { User } from '../auth/user.decorator';

import type { RequestUser } from '../auth/user.interface';
import type { PaginatedResponse } from '../pagination/pagination-response.interface';
import { Paginated } from '../pagination/paginated.decorator';
import { PaginationService } from '../pagination/pagination.service';
import { SocialAccountQueryDto } from './dto/social-accounts-query.dto';
import { SocialAccountProviderAuthUrlDto } from './dto/provider-auth-url.dto';
import { SocialProviderAppCredentialsService } from 'src/social-provider-app-credentials/social-provider-app-credentials.service';
import { CreateSocialAccountProviderAuthUrlDto } from './dto/create-provider-auth-url.dto';
import { SocialProviderAppCredentialsDto } from '../social-provider-app-credentials/dto/social-provider-app-credentials.dto';
import { createAuthUrlDescription } from './docs/create-auth-url.md';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { tasks } from '@trigger.dev/sdk';
import { PROCESS_WEBHOOK_TASK } from 'src/constants/string.constants';

@Controller('social-accounts')
@ApiTags('Social Accounts')
@ApiBearerAuth()
@Protect()
export class SocialAccountsController {
  constructor(
    private readonly socialAccountsService: SocialAccountsService,
    private readonly paginationService: PaginationService,
    private readonly socialProviderAppCredentialsService: SocialProviderAppCredentialsService,
  ) {}

  @Get()
  @Paginated(SocialAccountDto, { name: 'social accounts' })
  async getAllSocialAccounts(
    @Query() query: SocialAccountQueryDto,
    @User() user: RequestUser,
  ): Promise<PaginatedResponse<SocialAccountDto>> {
    try {
      return this.paginationService.createResponse(
        this.socialAccountsService.getSocialAccounts(query, user.projectId),
        query,
      );
    } catch (e) {
      console.error('/social-accounts', e);
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
    description: 'Social account retrieved successfully.',
    type: SocialAccountDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found based on the given ID.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when fetching the social account.',
  })
  @ApiOperation({ summary: 'Get social account by ID' })
  @ApiParam({
    name: 'id',
    description: 'Social Account ID',
    type: String,
    required: true,
  })
  async getSocialAccount(
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<SocialAccountDto> {
    let socialAccount: SocialAccountDto | null;

    try {
      socialAccount = await this.socialAccountsService.getSocialAccountById({
        id: params.id,
        projectId: user.projectId,
      });
    } catch (e) {
      console.error('/social-accounts/:id', e);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: e,
        },
      );
    }

    if (!socialAccount) {
      throw new HttpException('Social account not found', HttpStatus.NOT_FOUND);
    }

    return socialAccount;
  }

  @ApiOperation({
    summary: 'Create Social Account Auth URL',
    description: createAuthUrlDescription,
  })
  @ApiOkResponse({
    description: 'Social account auth URL retrieved successfully.',
    type: SocialAccountProviderAuthUrlDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'Social account credentials not found. Unable to create auth URL.',
  })
  @Post('auth-url')
  async createSocialAccountAuthUrl(
    @Body() createAuthUrlInput: CreateSocialAccountProviderAuthUrlDto,
    @User() user: RequestUser,
  ): Promise<SocialAccountProviderAuthUrlDto> {
    const socialProviderAppCredentials: SocialProviderAppCredentialsDto | null =
      createAuthUrlInput.platform === 'bluesky'
        ? {
            projectId: user.projectId,
            appId: '',
            appSecret: '',
            provider: 'bluesky',
          }
        : await this.socialProviderAppCredentialsService.getSocialProviderAppCredentials(
            createAuthUrlInput.platform,
            user.projectId,
          );

    if (!socialProviderAppCredentials) {
      throw new HttpException(
        'Social provider app credentials not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const authUrl = await this.socialAccountsService.getSocialAccountAuthUrl({
      projectId: user.projectId,
      appCredentials: socialProviderAppCredentials,
      providerData: createAuthUrlInput.platform_data,
      externalId: createAuthUrlInput.external_id,
    });

    return {
      url: authUrl || '',
      platform: createAuthUrlInput.platform,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update social account' })
  @ApiResponse({
    status: 200,
    description: 'Social account updated successfully.',
    type: SocialAccountDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when updating the social account.',
  })
  @ApiParam({
    name: 'id',
    description: 'Social Account ID',
    type: String,
    required: true,
  })
  async updateSocialAccount(
    @Param('id') id: string,
    @Body() updateData: UpdateSocialAccountDto,
    @User() user: RequestUser,
  ): Promise<SocialAccountDto> {
    try {
      const existingAccount =
        await this.socialAccountsService.getSocialAccountById({
          id,
          projectId: user.projectId,
        });

      if (!existingAccount) {
        throw new HttpException(
          'Social account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const updatedAccount =
        await this.socialAccountsService.updateSocialAccount({
          id,
          projectId: user.projectId,
          updateData,
        });

      await tasks.trigger(PROCESS_WEBHOOK_TASK, {
        projectId: user.projectId,
        eventType: 'social.account.updated',
        eventData: updatedAccount,
      });

      return updatedAccount;
    } catch (error) {
      console.error(`Error updating social account ${id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  @ApiOperation({
    summary: 'Disconnect a social account',
    description:
      'Disconnecting an account with remove all auth tokens and mark the account as disconnected. The record of the account will be kept and can be retrieved and reconnected by the owner of the account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account disconnected successfully',
    type: DisconnectedSocialAccountDto,
  })
  @ApiResponse({ status: 404, description: 'Social account not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post(':id/disconnect')
  async disconnectSocialAccount(
    @Param('id') id: string,
    @User() user: RequestUser,
  ): Promise<Omit<SocialAccountDto, 'status'> & { status: 'disconnected' }> {
    try {
      // Check if the account exists first
      const account = await this.socialAccountsService.getSocialAccountById({
        id,
        projectId: user.projectId,
      });

      if (!account) {
        throw new HttpException(
          'Social account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Proceed with disconnecting
      await this.socialAccountsService.disconnectSocialAccount(
        id,
        user.projectId,
      );

      await tasks.trigger(PROCESS_WEBHOOK_TASK, {
        projectId: user.projectId,
        eventType: 'social.account.updated',
        eventData: {
          ...account,
          access_token: '',
          refresh_token: '',
          status: 'disconnected',
        },
      });

      return {
        ...account,
        access_token: '',
        refresh_token: '',
        status: 'disconnected',
      };
    } catch (error) {
      console.error(`Error disconnecting social account ${id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  @ApiResponse({
    status: 200,
    description: 'Social Account created successfully.',
    type: SocialAccountDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when creating the Social Account.',
  })
  @ApiOperation({
    summary: 'Create Social Account',
    description:
      'If a social account with the same platform and user_id already exists, it will be updated. If not, a new social account will be created.',
  })
  @Post()
  async createSocialAccount(
    @Body() socialAccount: CreateSocialAccountDto,
    @User() user: RequestUser,
  ): Promise<SocialAccountDto> {
    try {
      const createdSocialAccount =
        await this.socialAccountsService.createSocialAccount({
          projectId: user.projectId,
          socialAccount,
        });

      if (!createdSocialAccount) {
        throw new Error('Unable to create post');
      }

      await tasks.trigger(PROCESS_WEBHOOK_TASK, {
        projectId: user.projectId,
        eventType: 'social.account.created',
        eventData: createdSocialAccount,
      });

      return createdSocialAccount;
    } catch (error) {
      console.error(error);
      throw new HttpException('Internal Server Error', 500);
    }
  }
}
