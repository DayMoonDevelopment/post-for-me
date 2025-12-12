import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';

@Module({
  exports: [InstagramService],
  providers: [InstagramService],
})
export class InstagramModule {}
