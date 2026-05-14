import { Module } from '@nestjs/common';

import { HealthcheckController } from './healthcheck.controller';
import { HealthcheckService } from './healthcheck.service';

@Module({
  controllers: [HealthcheckController],
  providers: [HealthcheckService],
})
export class HealthcheckModule {}
