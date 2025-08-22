import { ApiProperty } from '@nestjs/swagger';
import { Database } from '@post-for-me/db';

export type EventType = Database['public']['Enums']['webhook_event_type'];

export const eventValues: EventType[] = [
  'social.post.created',
  'social.post.updated',
  'social.post.deleted',
  'social.post.result.created',
  'social.account.created',
  'social.account.updated',
];

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
    items: { type: 'string', enum: eventValues },
  })
  event_types: string[];
}
