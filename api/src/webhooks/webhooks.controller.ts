import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpException,
  HttpStatus,
  Delete,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Protect } from 'src/auth/protect.decorator';
import { User } from 'src/auth/user.decorator';
import { RequestUser } from 'src/auth/user.interface';
import { Paginated } from 'src/pagination/paginated.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import { WebhookDto } from './dto/webhook.dto';
import { PaginatedResponse } from 'src/pagination/pagination-response.interface';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookQueryDto } from './dto/webhook-query.dto';
import { WebhooksService } from './webhooks.service';
import { DeleteEntityResponseDto } from '../lib/dto/global.dto';

import { AppLogger } from '../logger/app-logger';

@Controller('webhooks')
@ApiTags('Webhooks')
@ApiBearerAuth()
@Protect()
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly paginationService: PaginationService,
    private readonly logger: AppLogger,
  ) {}

  @Get()
  @Paginated(WebhookDto, { name: 'webhooks' })
  async getAllWebhooks(
    @Query() query: WebhookQueryDto,
    @User() user: RequestUser,
  ): Promise<PaginatedResponse<WebhookDto>> {
    try {
      return this.paginationService.createResponse(
        this.webhooksService.buildWebhookQuery({
          queryParams: query,
          projectId: user.projectId,
        }),
        query,
      );
    } catch (error) {
      this.logger.errorWithMeta('getAllWebhooks failed', error, {
        projectId: user.projectId,
        query,
      });
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Webhook retrieved successfully.',
    type: WebhookDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Webhook not found based on the given ID.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when fetching the webhook.',
  })
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
    type: String,
    required: true,
  })
  async getWebhook(
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<WebhookDto> {
    let webhook: WebhookDto | null = null;
    try {
      webhook = await this.webhooksService.getWebhookById({
        id: params.id,
        projectId: user.projectId,
      });
    } catch (error) {
      this.logger.errorWithMeta('getWebhook failed', error, {
        projectId: user.projectId,
        webhookId: params.id,
      });
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!webhook) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }

    return webhook;
  }

  @ApiResponse({
    status: 200,
    description: 'Webhook created successfully.',
    type: WebhookDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when creating the Webhook.',
  })
  @ApiOperation({
    summary: 'Create Webhook',
  })
  @Post()
  async createWebhook(
    @Body() webhookBody: CreateWebhookDto,
    @User() user: RequestUser,
  ): Promise<WebhookDto> {
    if (
      !webhookBody.url ||
      !webhookBody.event_types ||
      webhookBody.event_types.length == 0
    ) {
      throw new HttpException('Webhook is missing required values', 400);
    }

    try {
      const createdWebhook = await this.webhooksService.createWebhook({
        projectId: user.projectId,
        webhook: webhookBody,
      });

      if (!createdWebhook) {
        throw new Error('Something went wrong');
      }

      return createdWebhook;
    } catch (error) {
      this.logger.errorWithMeta('createWebhook failed', error, {
        projectId: user.projectId,
      });
      throw new HttpException('Internal Server Error', 500);
    }
  }

  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully.',
    type: WebhookDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Webhook not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when updating the Webhook.',
  })
  @ApiOperation({
    summary: 'Update Webhook',
  })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
    type: String,
    required: true,
  })
  @Patch(':id')
  async updateWebhook(
    @Body() webhookUpdate: UpdateWebhookDto,
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<WebhookDto> {
    const webhook = await this.webhooksService.getWebhookById({
      id: params.id,
      projectId: user.projectId,
    });

    if (!webhook) {
      throw new HttpException('Webhook not found', 404);
    }

    try {
      const updatedWebhook = await this.webhooksService.updateWebhook({
        id: params.id,
        projectId: user.projectId,
        webhook: webhookUpdate,
      });

      if (!updatedWebhook) {
        throw new Error('Something went wrong');
      }

      return updatedWebhook;
    } catch (error) {
      this.logger.errorWithMeta('updateWebhook failed', error, {
        projectId: user.projectId,
        webhookId: params.id,
      });
      throw new HttpException('Internal Server Error', 500);
    }
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'Webhook deleted successfully.',
    type: DeleteEntityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Webhook not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error when deleting the webhook.',
  })
  @ApiOperation({ summary: 'Delete Webhook' })
  @ApiParam({
    name: 'id',
    description: 'Webhook ID',
    type: String,
    required: true,
  })
  async deleteWebhook(
    @Param() params: { id: string },
    @User() user: RequestUser,
  ): Promise<DeleteEntityResponseDto> {
    const webhook = await this.webhooksService.getWebhookById({
      id: params.id,
      projectId: user.projectId,
    });

    if (!webhook) {
      throw new HttpException('Webhook not found', 404);
    }

    try {
      const deleteResponse = await this.webhooksService.deleteWebhook({
        id: params.id,
        projectId: user.projectId,
      });
      return deleteResponse;
    } catch (error) {
      this.logger.errorWithMeta('deleteWebhook failed', error, {
        projectId: user.projectId,
        webhookId: params.id,
      });
      throw new HttpException('Internal Server Error', 500);
    }
  }
}
