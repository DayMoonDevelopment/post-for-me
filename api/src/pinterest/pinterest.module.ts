import { Module } from '@nestjs/common';
import { PinterestService } from './pinterest.service';
import { PinterestController } from './pinterest.controller';

@Module({
  controllers: [PinterestController],
  exports: [PinterestService],
  providers: [PinterestService],
})
export class PinterestModule {}
