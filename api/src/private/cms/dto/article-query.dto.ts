import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const toStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.flatMap((v) =>
      typeof v === 'string'
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return undefined;
};

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
};

export class ArticleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  category?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  exclude_category?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  tag?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  exclude_tag?: string[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  featured?: boolean;
}
