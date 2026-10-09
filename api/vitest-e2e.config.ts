import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Nest's DI resolves undecorated constructor params (e.g. SupabaseService
  // in AuthGuard) via TypeScript's emitted `design:paramtypes` metadata.
  // Vitest's default esbuild transform doesn't emit that metadata, so a
  // real Test.createTestingModule() bootstrap fails to resolve them. The
  // unit suite never hits this — it constructs classes by hand instead of
  // going through Nest's DI container.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    setupFiles: ['./test/setup-env.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // e2e specs share one real Postgres instance and one seeded fixture
    // project, so concurrent files would race on lookups/cleanup.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage-e2e',
    },
  },
});
