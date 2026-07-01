import { Module } from '@nestjs/common';
import { R2MediaStorageService } from './r2.service';

@Module({
  providers: [R2MediaStorageService],
  exports: [R2MediaStorageService],
})
export class R2Module {}
