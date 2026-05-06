import { Global, Module } from '@nestjs/common';

import { KyselyService } from './kysely.service';

@Global()
@Module({
  providers: [KyselyService],
  exports: [KyselyService],
})
export class KyselyModule {}
