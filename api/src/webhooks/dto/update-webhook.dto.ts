import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WebhookEventType } from './create-webhook.dto';

export class UpdateWebhookDto {
  @ApiProperty({
    description: 'Public url to recieve event data',
    required: false,
  })
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'List of events the webhook will recieve',
    required: false,
    type: 'array',
    items: { type: 'string', enum: Object.values(WebhookEventType) },
  })
  @IsEnum(WebhookEventType, { each: true })
  @IsOptional()
  event_types?: string[];
}
