import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';

import { HealthcheckService } from './healthcheck.service';

@Controller({ path: 'healthcheck', version: VERSION_NEUTRAL })
export class HealthcheckController {
  constructor(private readonly healthcheckService: HealthcheckService) {}

  @Get()
  async getHealthcheck(): Promise<{ status: 'ok' }> {
    try {
      await this.healthcheckService.checkDatabaseConnection();
      return { status: 'ok' };
    } catch (error) {
      console.error('[healthcheck] database connection check failed', error);
      throw new HttpException(
        'Database connection is unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
