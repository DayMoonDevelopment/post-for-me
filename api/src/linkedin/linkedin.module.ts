import { Module } from '@nestjs/common';
import { LinkedInService } from './linkedin.service';

@Module({
  exports: [LinkedInService],
  providers: [LinkedInService],
})
export class LinkedInModule {}
