import { Module } from '@nestjs/common';
import { PinterestService } from './pinterest.service';

@Module({
  exports: [PinterestService],
  providers: [PinterestService],
})
export class PinterestModule {}
