import { Module, Scope } from '@nestjs/common';
import { PaginationService } from './pagination.service';

@Module({
  providers: [
    {
      provide: PaginationService,
      useClass: PaginationService,
      scope: Scope.REQUEST,
    },
  ],
  exports: [PaginationService],
})
export class PaginationModule {}
