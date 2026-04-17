import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WebhookDto } from './dto/webhook.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookQueryDto } from './dto/webhook-query.dto';
import { DeleteEntityResponseDto } from '../lib/dto/global.dto';
import { Database } from '@post-for-me/db';
import { randomUUID } from 'crypto';
import {
  decodePaginationCursor,
  encodePaginationCursor,
} from '../pagination/cursor';

type WebhookEventType = Database['public']['Enums']['webhook_event_type'];

@Injectable()
export class WebhooksService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async buildWebhookQuery({
    queryParams,
    projectId,
  }: {
    queryParams: WebhookQueryDto;
    projectId: string;
  }): Promise<{
    data: WebhookDto[];
    count: number;
    next_cursor: string | null;
  }> {
    const { offset, limit, url, event_type, id, cursor } = queryParams;

    const decodedCursor = decodePaginationCursor(cursor);
    const isCursorPagination = typeof cursor === 'string';
    const pageSize = isCursorPagination ? limit + 1 : limit;

    const idSelect = event_type
      ? 'id, created_at, webhook_subscribed_event_types!inner(type)'
      : 'id, created_at';

    const webhookIdQuery = this.supabaseService.supabaseClient
      .from('webhooks')
      .select(idSelect, {
        count: 'estimated',
        head: false,
      })
      .eq('project_id', projectId);

    if (url) {
      const values: string[] = [];

      switch (true) {
        case typeof url === 'string': {
          values.push(...(url as string).split(','));
          break;
        }
        case Array.isArray(url):
          values.push(...url);
          break;
        default:
          values.push(url);
          break;
      }

      webhookIdQuery.in('url', values);
    }

    if (event_type) {
      const values: string[] = [];

      switch (true) {
        case typeof event_type === 'string': {
          values.push(...(event_type as string).split(','));
          break;
        }
        case Array.isArray(event_type):
          values.push(...event_type);
          break;
        default:
          values.push(event_type);
          break;
      }

      webhookIdQuery.in(
        'webhook_subscribed_event_types.type',
        values as WebhookEventType[],
      );
    }

    if (id) {
      const values: string[] = [];

      switch (true) {
        case typeof id === 'string': {
          values.push(...(id as string).split(','));
          break;
        }
        case Array.isArray(id):
          values.push(...id);
          break;
        default:
          values.push(id);
          break;
      }

      webhookIdQuery.in('id', values);
    }

    if (decodedCursor && isCursorPagination) {
      webhookIdQuery.or(
        `created_at.lt.${decodedCursor.created_at},and(created_at.eq.${decodedCursor.created_at},id.lt.${decodedCursor.id})`,
      );
    }

    webhookIdQuery.order('created_at', { ascending: false });
    webhookIdQuery.order('id', { ascending: false });

    if (isCursorPagination) {
      webhookIdQuery.limit(pageSize);
    } else {
      webhookIdQuery.range(offset, offset + limit - 1);
    }

    const { data: rawWebhookIds, error, count } = await webhookIdQuery;

    if (error) {
      throw error;
    }

    const idRows = (rawWebhookIds || []) as unknown as Array<{
      id: string;
      created_at: string;
    }>;
    const hasMore = isCursorPagination ? idRows.length > limit : false;
    const paginatedRows = isCursorPagination ? idRows.slice(0, limit) : idRows;
    const webhookIds = paginatedRows.map((row) => row.id);
    const lastRecord = paginatedRows.length
      ? paginatedRows[paginatedRows.length - 1]
      : null;

    const nextCursor =
      hasMore && lastRecord
        ? encodePaginationCursor({
            created_at: lastRecord.created_at,
            id: lastRecord.id,
          })
        : null;

    if (webhookIds.length === 0) {
      return {
        data: [],
        count: count || 0,
        next_cursor: nextCursor,
      };
    }

    const { data: webhooks, error: webhookDetailsError } =
      await this.supabaseService.supabaseClient
        .from('webhooks')
        .select('id, url, secret_key, webhook_subscribed_event_types(type)')
        .eq('project_id', projectId)
        .in('id', webhookIds);

    if (webhookDetailsError) {
      throw webhookDetailsError;
    }

    const positionById = new Map(
      webhookIds.map((webhookId, idx) => [webhookId, idx]),
    );
    const sortedWebhooks = [...(webhooks || [])].sort((a, b) => {
      const aPos = positionById.get(a.id) ?? 0;
      const bPos = positionById.get(b.id) ?? 0;

      return aPos - bPos;
    });

    const transformedData: WebhookDto[] = sortedWebhooks.map((raw) => ({
      id: raw.id,
      url: raw.url,
      secret: raw.secret_key,
      event_types: raw.webhook_subscribed_event_types.map((x) => x.type),
    }));

    return {
      data: transformedData || [],
      count: count || 0,
      next_cursor: nextCursor,
    };
  }

  async getWebhookById({
    id,
    projectId,
  }: {
    id: string;
    projectId: string;
  }): Promise<WebhookDto | null> {
    const { data, error } = await this.supabaseService.supabaseClient
      .from('webhooks')
      .select('id, url, secret_key, webhook_subscribed_event_types!inner(type)')
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch webhook: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      url: data.url,
      secret: data.secret_key,
      event_types: data.webhook_subscribed_event_types.map((x) => x.type),
    };
  }

  async createWebhook({
    webhook,
    projectId,
  }: {
    webhook: CreateWebhookDto;
    projectId: string;
  }): Promise<WebhookDto | null> {
    const webhookSecret = this.generateWebhookSecret();

    const createdWebhook = await this.supabaseService.supabaseClient
      .from('webhooks')
      .insert({
        project_id: projectId,
        url: webhook.url,
        secret_key: webhookSecret,
      })
      .select()
      .single();

    if (createdWebhook.error) {
      throw createdWebhook.error;
    }

    if (!createdWebhook.data) {
      return null;
    }

    const createdEventTypes = await this.supabaseService.supabaseClient
      .from('webhook_subscribed_event_types')
      .insert(
        webhook.event_types.map((event) => ({
          webhook_id: createdWebhook.data.id,
          type: event as WebhookEventType,
        })),
      );

    if (createdEventTypes.error) {
      throw createdEventTypes.error;
    }

    return this.getWebhookById({
      id: createdWebhook.data.id,
      projectId,
    });
  }

  async updateWebhook({
    id,
    webhook,
    projectId,
  }: {
    id: string;
    webhook: UpdateWebhookDto;
    projectId: string;
  }): Promise<WebhookDto | null> {
    if (webhook.url) {
      const createdWebhook = await this.supabaseService.supabaseClient
        .from('webhooks')
        .update({
          url: webhook.url,
        })
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single();

      if (createdWebhook.error) {
        throw createdWebhook.error;
      }

      if (!createdWebhook.data) {
        return null;
      }
    }

    if (webhook.event_types) {
      const createdEventTypes = await this.supabaseService.supabaseClient
        .from('webhook_subscribed_event_types')
        .upsert(
          webhook.event_types.map((event) => ({
            webhook_id: id,
            type: event as WebhookEventType,
          })),
          { onConflict: 'webhook_id,type' },
        );

      if (createdEventTypes.error) {
        throw createdEventTypes.error;
      }
    }

    return this.getWebhookById({ id, projectId });
  }

  async deleteWebhook({
    id,
    projectId,
  }: {
    id: string;
    projectId: string;
  }): Promise<DeleteEntityResponseDto> {
    const { error } = await this.supabaseService.supabaseClient
      .from('webhooks')
      .delete()
      .eq('project_id', projectId)
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  private generateWebhookSecret(): string {
    return `whsec_${randomUUID().replace(/-/g, '')}${Math.random().toString(36).substring(2, 15)}`;
  }
}
