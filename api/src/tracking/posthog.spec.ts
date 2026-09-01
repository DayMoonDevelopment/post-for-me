import type * as PosthogModule from './posthog';

const mockIsFeatureEnabled = jest.fn();

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    isFeatureEnabled: mockIsFeatureEnabled,
  })),
}));

// isR2StorageEnabled caches results in a module-level Map, and getClient()
// caches the PostHog client in a module-level singleton. Reset the module
// registry between tests so each test starts with a clean cache/client.
async function loadModule(): Promise<typeof PosthogModule> {
  let mod: typeof PosthogModule | undefined;
  await jest.isolateModulesAsync(async () => {
    mod = await import('./posthog');
  });
  return mod!;
}

describe('isR2StorageEnabled', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      POST_HOG_API_KEY: 'test-key',
      POST_HOG_API_HOST: 'https://posthog.test',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns false without calling PostHog when teamId is empty', async () => {
    const { isR2StorageEnabled } = await loadModule();

    await expect(isR2StorageEnabled('')).resolves.toBe(false);
    expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
  });

  it('returns false without calling PostHog when unconfigured', async () => {
    process.env.POST_HOG_API_KEY = '';
    process.env.POST_HOG_API_HOST = '';
    const { isR2StorageEnabled } = await loadModule();

    await expect(isR2StorageEnabled('team_1')).resolves.toBe(false);
    expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
  });

  it('caches a truthy result and does not re-call PostHog within the TTL', async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    const { isR2StorageEnabled } = await loadModule();

    await expect(isR2StorageEnabled('team_1', 'project_1')).resolves.toBe(true);
    await expect(isR2StorageEnabled('team_1', 'project_1')).resolves.toBe(true);

    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(1);
  });

  it('caches independently per team/project key', async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    const { isR2StorageEnabled } = await loadModule();

    await isR2StorageEnabled('team_1', 'project_1');
    await isR2StorageEnabled('team_1', 'project_2');

    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(2);
  });

  it('re-fetches once the cache entry expires', async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    const { isR2StorageEnabled } = await loadModule();
    const now = jest.spyOn(Date, 'now');

    now.mockReturnValue(0);
    await isR2StorageEnabled('team_1');

    now.mockReturnValue(30_000);
    await isR2StorageEnabled('team_1');
    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(1);

    now.mockReturnValue(60_001);
    await isR2StorageEnabled('team_1');
    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(2);

    now.mockRestore();
  });

  it('falls back to false and still caches the failure on a PostHog error', async () => {
    mockIsFeatureEnabled.mockRejectedValue(new Error('posthog down'));
    const { isR2StorageEnabled } = await loadModule();

    await expect(isR2StorageEnabled('team_1')).resolves.toBe(false);
    await expect(isR2StorageEnabled('team_1')).resolves.toBe(false);

    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(1);
  });
});
