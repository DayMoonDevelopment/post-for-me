import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { eventValues } from './create-webhook.dto';

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
    items: { type: 'string', enum: eventValues },
  })
  @IsOptional()
  event_types?: string[];
}
