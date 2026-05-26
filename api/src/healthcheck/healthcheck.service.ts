import { Injectable } from '@nestjs/common';

import { KyselyService } from '../kysely/kysely.service';

@Injectable()
export class HealthcheckService {
  constructor(private readonly kyselyService: KyselyService) {}

  async checkDatabaseConnection(): Promise<void> {
    await this.kyselyService.db
      .selectNoFrom((expressionBuilder) => expressionBuilder.val(1).as('ok'))
      .executeTakeFirst();
  }
}
