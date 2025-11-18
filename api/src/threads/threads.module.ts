import { Module } from '@nestjs/common';
import { ThreadsService } from './threads.service';

@Module({
  exports: [ThreadsService],
  providers: [ThreadsService],
})
export class ThreadsModule {}
