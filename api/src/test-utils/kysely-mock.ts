import { vi, type Mock } from 'vitest';

const CHAIN_METHODS = [
  'insertInto',
  'updateTable',
  'deleteFrom',
  'values',
  'set',
  'where',
] as const;

type ChainMethod = (typeof CHAIN_METHODS)[number];

export interface KyselyDbMock extends Record<ChainMethod, Mock> {
  onConflict: Mock;
  execute: Mock;
  transaction: Mock;
}

/**
 * Builds a chainable mock of the subset of Kysely's query builder used by
 * StripeSyncService: `insertInto/updateTable/deleteFrom(...).values/set/where(...)`,
 * `.onConflict(cb).execute()`, and `db.transaction().execute(async (trx) => ...)`
 * (where `trx` is the same mock, so nested calls chain identically).
 */
export function createKyselyDbMock(): KyselyDbMock {
  const builder = {} as KyselyDbMock;

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }

  builder.onConflict = vi.fn((callback: (oc: unknown) => unknown) => {
    const oc = { column: vi.fn(() => oc), doUpdateSet: vi.fn(() => oc) };
    callback(oc);
    return builder;
  });

  builder.execute = vi.fn().mockResolvedValue(undefined);

  builder.transaction = vi.fn(() => ({
    execute: vi.fn((callback: (trx: KyselyDbMock) => Promise<unknown>) =>
      callback(builder),
    ),
  }));

  return builder;
}
