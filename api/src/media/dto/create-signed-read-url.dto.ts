import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSignedReadUrlDto {
  @ApiProperty({ description: 'The object key of the media to sign' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({
    description: 'Expiry in seconds (default: 3600, max: 604800)',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(604800)
  @Type(() => Number)
  expires_in?: number;
}

export class CreateSignedReadUrlResponseDto {
  @ApiProperty({
    description: 'Signed URL for private read access',
    type: String,
  })
  signed_url: string;
}
