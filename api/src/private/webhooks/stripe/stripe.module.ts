import { Module } from '@nestjs/common';

import { StripeWebhookController } from './stripe.controller';
import { StripeWebhookService } from './stripe.service';
import { StripeSyncService } from './stripe-sync.service';

@Module({
  controllers: [StripeWebhookController],
  providers: [StripeWebhookService, StripeSyncService],
  exports: [StripeSyncService],
})
export class StripeWebhookModule {}
