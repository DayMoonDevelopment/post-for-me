import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum WebhookEventType {
  'social.post.created',
  'social.post.updated',
  'social.post.deleted',
  'social.post.result.created',
  'social.account.created',
  'social.account.updated',
  'media.created',
  'media.deleted',
}

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Public url to recieve event data',
    required: true,
  })
  url: string;

  @ApiProperty({
    description: 'List of events the webhook will recieve',
    required: true,
    type: 'array',
    items: { type: 'string', enum: Object.values(WebhookEventType) },
  })
  @IsEnum(WebhookEventType, { each: true })
  event_types: string[];
}
