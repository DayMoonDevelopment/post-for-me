import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PinterestBoardsQueryDto {
  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 250 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(250)
  limit: number = 25;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous page.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
