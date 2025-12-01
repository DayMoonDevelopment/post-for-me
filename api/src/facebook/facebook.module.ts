import { Module } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Module({
  exports: [FacebookService],
  providers: [FacebookService],
})
export class FacebookModule {}
