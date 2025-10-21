import type { PlatformPostDto } from './platform-post.dto';

export interface PaginationPlatformPostMeta {
  cursor: string;
  limit: number;
  next: string | null;
}

export interface PaginatedPlatformPostResponse {
  data: PlatformPostDto[];
  meta: PaginationPlatformPostMeta;
}
