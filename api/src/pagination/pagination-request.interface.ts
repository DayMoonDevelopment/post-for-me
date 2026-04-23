export type PaginatedRequestQuery<T> = Promise<{
  data: T[];
  count: number;
  next_cursor?: string | null;
}>;
