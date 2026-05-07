import {
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { StripeWebhookService } from './stripe.service';

@Controller({ version: VERSION_NEUTRAL })
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!signature) {
      throw new HttpException(
        'Missing stripe-signature header',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new HttpException(
        'Raw request body unavailable',
        HttpStatus.BAD_REQUEST,
      );
    }

    let event;
    try {
      event = this.stripeWebhookService.constructEvent(rawBody, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature';
      this.logger.warn(`Stripe webhook signature failure: ${message}`);
      throw new HttpException(
        `Webhook Error: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.stripeWebhookService.handleEvent(event);
    } catch (err) {
      // Respond 500 so Stripe retries. We don't persist the event log
      // ourselves — Stripe Dashboard is the audit source of truth.
      this.logger.error(`Failed to process stripe event ${event.id}`, err);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { received: true };
  }
}
