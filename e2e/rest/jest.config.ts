import type { Config } from 'jest';

const config: Config = {
  displayName: 'e2e:rest',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  globalSetup: '<rootDir>/global-setup.ts',
  testTimeout: 30_000,
  maxWorkers: 1,
  verbose: true,
};

export default config;
