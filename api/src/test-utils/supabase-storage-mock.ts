import { vi } from 'vitest';

export interface MockStorageResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * Builds a mock of `supabaseClient.storage`, whose shape differs from the
 * `.from(table)` query builder — `.from(bucket)` here returns a plain object
 * of storage operations that resolve directly, with no further chaining.
 */
export function createSupabaseStorageMock(result: MockStorageResult) {
  return {
    from: vi.fn().mockReturnValue({
      createSignedUploadUrl: vi.fn().mockResolvedValue(result),
    }),
  };
}
