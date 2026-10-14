import { vi, type Mock } from 'vitest';

export interface MockQueryResult<T = unknown> {
  data?: T | null;
  error: { message: string } | null;
  count?: number | null;
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'in',
  'range',
  'order',
  'single',
] as const;

type ChainMethod = (typeof CHAIN_METHODS)[number];

export type SupabaseQueryMock<T = unknown> = Record<ChainMethod, Mock> &
  PromiseLike<MockQueryResult<T>>;

/**
 * Builds a chainable + thenable mock of the postgrest-js query builder returned by
 * `supabaseClient.from(table)`. Every chain method returns the same mock instance
 * (matching postgrest-js's mutate-and-return-this chaining), and the mock itself is
 * thenable so `await query` resolves without a terminal call like `.single()`.
 */
export function createSupabaseQueryMock<T = unknown>(
  result: MockQueryResult<T> = { data: null, error: null },
): SupabaseQueryMock<T> {
  const builder = {} as SupabaseQueryMock<T>;

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }

  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}
