import { ApiProperty } from '@nestjs/swagger';

export class WebhookDto {
  @ApiProperty({ description: 'The unique identifier of the webhook' })
  id: string;

  @ApiProperty({ description: 'The public webhook url' })
  url: string;

  @ApiProperty({
    description: 'Secret key used to verify webhook post',
  })
  secret: string;

  @ApiProperty({
    description: 'Events that will be sent to the webhook',
  })
  event_types: string[];
}
