export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  next_cursor: string | null;
  next: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
