import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';

@Module({
  controllers: [InstagramController],
  exports: [InstagramService],
  providers: [InstagramService],
})
export class InstagramModule {}
