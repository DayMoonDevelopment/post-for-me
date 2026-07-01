import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaMimeType {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  MP4 = 'video/mp4',
  QUICKTIME = 'video/quicktime',
}

export class CreateUploadUrlDto {
  @ApiProperty({ enum: MediaMimeType })
  @IsEnum(MediaMimeType)
  mime_type: MediaMimeType;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  size_bytes?: number;
}
